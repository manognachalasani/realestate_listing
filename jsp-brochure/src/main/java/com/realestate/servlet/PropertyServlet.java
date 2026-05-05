package com.realestate.servlet;

import com.google.gson.*;
import com.realestate.model.PropertyData;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;

@WebServlet("/brochure")
public class PropertyServlet extends HttpServlet {

    private static final String API_BASE = "http://localhost:5000/api";
    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String propertyId = request.getParameter("propertyId");

        if (propertyId == null || propertyId.trim().isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "propertyId parameter is required");
            return;
        }

        // Redirect PDF requests to the dedicated PDF servlet
        if ("pdf".equals(request.getParameter("format"))) {
            response.sendRedirect(request.getContextPath() + "/brochure/pdf?propertyId=" + propertyId);
            return;
        }

        String apiUrl = API_BASE + "/properties/" + propertyId;

        try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
            HttpGet httpGet = new HttpGet(apiUrl);
            httpGet.setHeader("Accept", "application/json");

            try (CloseableHttpResponse apiResponse = httpClient.execute(httpGet)) {
                int statusCode = apiResponse.getStatusLine().getStatusCode();

                if (statusCode == 404) {
                    response.sendError(HttpServletResponse.SC_NOT_FOUND, "Property not found");
                    return;
                }
                if (statusCode != 200) {
                    response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "API error");
                    return;
                }

                String json = EntityUtils.toString(apiResponse.getEntity());
                PropertyData pd = parseProperty(json);

                // Expose as typed object and raw JSON so JSP has both available
                request.setAttribute("pd", pd);
                request.setAttribute("propertyJson", json);

                request.getRequestDispatcher("/WEB-INF/brochure.jsp").forward(request, response);
            }
        } catch (Exception e) {
            getServletContext().log("Error fetching property: " + e.getMessage(), e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Could not connect to property service: " + e.getMessage());
        }
    }

    static PropertyData parseProperty(String json) {
        Gson gson = new Gson();
        JsonObject p = gson.fromJson(json, JsonObject.class);
        PropertyData pd = new PropertyData();

        pd.id          = safeStr(p, "_id");
        pd.title       = safeStr(p, "title");
        pd.description = safeStr(p, "description");
        pd.propertyType = safeStr(p, "propertyType");
        pd.listingType  = safeStr(p, "listingType");
        pd.bedrooms  = safeInt(p, "bedrooms");
        pd.bathrooms = safeInt(p, "bathrooms");
        pd.garages   = safeInt(p, "garages");
        pd.area      = safeInt(p, "area");
        pd.yearBuilt = safeInt(p, "yearBuilt");
        pd.furnished    = safeStr(p, "furnished");
        pd.floorPlanUrl = safeStr(p, "floorPlanUrl");
        pd.virtualTourUrl = safeStr(p, "virtualTourUrl");

        if (p.has("price") && !p.get("price").isJsonNull()) {
            pd.price = p.get("price").getAsLong();
            pd.formattedPrice = String.format("$%,d", pd.price);
            if ("rent".equals(pd.listingType)) pd.formattedPrice += "/month";
        }

        if (p.has("address") && p.get("address").isJsonObject()) {
            JsonObject addr = p.getAsJsonObject("address");
            pd.street  = safeStr(addr, "street");
            pd.city    = safeStr(addr, "city");
            pd.state   = safeStr(addr, "state");
            pd.zipCode = safeStr(addr, "zipCode");
            pd.country = safeStr(addr, "country");
            pd.fullAddress = pd.street + ", " + pd.city + ", " + pd.state + " " + pd.zipCode;
        } else {
            pd.fullAddress = "";
        }

        pd.photoUrls = new ArrayList<>();
        if (p.has("photos") && p.get("photos").isJsonArray()) {
            for (JsonElement el : p.getAsJsonArray("photos")) {
                if (el.isJsonObject() && el.getAsJsonObject().has("url")) {
                    pd.photoUrls.add(el.getAsJsonObject().get("url").getAsString());
                }
            }
        }
        pd.primaryPhotoUrl = pd.photoUrls.isEmpty() ? "" : pd.photoUrls.get(0);

        pd.amenities = new ArrayList<>();
        if (p.has("amenities") && p.get("amenities").isJsonArray()) {
            for (JsonElement el : p.getAsJsonArray("amenities")) {
                if (!el.isJsonNull()) pd.amenities.add(el.getAsString());
            }
        }

        if (p.has("agent") && !p.get("agent").isJsonNull() && p.get("agent").isJsonObject()) {
            JsonObject agent = p.getAsJsonObject("agent");
            pd.agentName  = (safeStr(agent, "firstName") + " " + safeStr(agent, "lastName")).trim();
            pd.agentEmail = safeStr(agent, "email");
            pd.agentPhone = safeStr(agent, "phone");
            pd.agentAvatar = safeStr(agent, "avatar");
            if (agent.has("agentProfile") && agent.get("agentProfile").isJsonObject()) {
                pd.agentAgency = safeStr(agent.getAsJsonObject("agentProfile"), "agency");
            }
        }

        return pd;
    }

    static String safeStr(JsonObject obj, String key) {
        if (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) {
            try { return obj.get(key).getAsString(); } catch (Exception e) { return ""; }
        }
        return "";
    }

    static int safeInt(JsonObject obj, String key) {
        if (obj != null && obj.has(key) && !obj.get(key).isJsonNull()) {
            try { return obj.get(key).getAsInt(); } catch (Exception e) { return 0; }
        }
        return 0;
    }
}
