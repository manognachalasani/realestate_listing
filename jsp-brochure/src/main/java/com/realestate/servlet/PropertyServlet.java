package com.realestate.servlet;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
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

        // Fetch property data from Node.js API
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
                JsonObject property = gson.fromJson(json, JsonObject.class);

                // Pass property data to JSP
                request.setAttribute("property", property);
                request.setAttribute("propertyJson", json);

                // Check if PDF export is requested
                String format = request.getParameter("format");
                if ("pdf".equals(format)) {
                    request.getRequestDispatcher("/WEB-INF/brochure-pdf.jsp")
                           .forward(request, response);
                } else {
                    request.getRequestDispatcher("/WEB-INF/brochure.jsp")
                           .forward(request, response);
                }
            }
        } catch (Exception e) {
            getServletContext().log("Error fetching property: " + e.getMessage(), e);
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                "Could not connect to property service: " + e.getMessage());
        }
    }
}
