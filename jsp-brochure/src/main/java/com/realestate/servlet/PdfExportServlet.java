package com.realestate.servlet;

import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
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
import java.io.OutputStream;
import java.net.URL;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@WebServlet("/brochure/pdf")
public class PdfExportServlet extends HttpServlet {

    private static final String API_BASE = "http://localhost:5000/api";

    // Brand colours
    private static final BaseColor WHITE = new BaseColor(255, 255, 255);
    private static final BaseColor NAVY  = new BaseColor(15,  25,  35);
    private static final BaseColor GOLD  = new BaseColor(201, 168, 76);
    private static final BaseColor CREAM = new BaseColor(250, 248, 244);
    private static final BaseColor LGRAY = new BaseColor(228, 224, 216);
    private static final BaseColor TEXT  = new BaseColor(55,  55,  70);
    private static final BaseColor MUTED = new BaseColor(130, 130, 145);

    // A4 dimensions (points)
    private static final float W      = PageSize.A4.getWidth();   // 595
    private static final float H      = PageSize.A4.getHeight();  // 842
    private static final float MARGIN = 32f;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String propertyId = request.getParameter("propertyId");
        if (propertyId == null || propertyId.trim().isEmpty()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "propertyId is required");
            return;
        }

        PropertyData pd = fetchProperty(propertyId);
        if (pd == null) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND, "Property not found");
            return;
        }

        String slug = pd.title != null
                ? pd.title.toLowerCase().replaceAll("[^a-z0-9]+", "-") + "-brochure.pdf"
                : "property-brochure.pdf";

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "inline; filename=\"" + slug + "\"");
        response.setHeader("X-Content-Type-Options", "nosniff");

        try {
            buildPdf(pd, response.getOutputStream());
        } catch (DocumentException e) {
            throw new IOException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    // ── Data fetch ────────────────────────────────────────────────────────────

    private PropertyData fetchProperty(String propertyId) throws IOException {
        String url = API_BASE + "/properties/" + propertyId;
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpGet get = new HttpGet(url);
            get.setHeader("Accept", "application/json");
            try (CloseableHttpResponse r = client.execute(get)) {
                if (r.getStatusLine().getStatusCode() != 200) return null;
                return PropertyServlet.parseProperty(EntityUtils.toString(r.getEntity()));
            }
        }
    }

    // ── PDF builder ───────────────────────────────────────────────────────────

    private void buildPdf(PropertyData pd, OutputStream out) throws DocumentException, IOException {
        Document doc = new Document(PageSize.A4, 0, 0, 0, 0);
        PdfWriter writer = PdfWriter.getInstance(doc, out);
        doc.open();

        BaseFont bf     = BaseFont.createFont(BaseFont.HELVETICA,      BaseFont.CP1252, false);
        BaseFont bfBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.CP1252, false);

        PdfContentByte cv = writer.getDirectContent();

        // ── 1. HEADER (navy backdrop, hero image, text panel) ─────────────────
        final float HEADER_H = 210f;
        final float HEADER_Y = H - HEADER_H;          // bottom of header

        // Navy background
        fillRect(cv, NAVY, 0, HEADER_Y, W, HEADER_H);

        // Hero image — left half
        if (pd.primaryPhotoUrl != null && !pd.primaryPhotoUrl.isEmpty()) {
            try {
                Image hero = Image.getInstance(new URL(pd.primaryPhotoUrl));
                hero.scaleAbsolute(W / 2f, HEADER_H);
                hero.setAbsolutePosition(0, HEADER_Y);
                doc.add(hero);
            } catch (Exception ignored) { /* missing image — navy bg shows through */ }
        }

        // Gold vertical accent strip
        fillRect(cv, GOLD, W / 2f - 3, HEADER_Y, 3, HEADER_H);

        // Right text panel
        float tx = W / 2f + MARGIN * 0.6f;
        float tw = W / 2f - MARGIN * 1.2f;

        // Logo
        drawText(cv, bf,     11, new BaseColor(210, 215, 220), tx, H - 26, "ESTATE");
        drawText(cv, bfBold, 11, GOLD,
                tx + bf.getWidthPoint("ESTATE", 11), H - 26, "HUB");

        // Listing badge
        String badge = ("rent".equals(pd.listingType) ? "FOR RENT" : "FOR SALE")
                + "  ·  " + (pd.propertyType != null ? pd.propertyType.toUpperCase() : "");
        drawText(cv, bfBold, 7.5f, GOLD, tx, H - 46, badge);

        // Title (up to two lines of ~36 chars each)
        List<String> titleLines = wrap(pd.title != null ? pd.title : "", bfBold, 16, tw);
        float ty = H - 68;
        for (String line : titleLines) {
            drawText(cv, bfBold, 16, WHITE, tx, ty, line);
            ty -= 20;
        }

        // Price
        drawText(cv, bfBold, 22, GOLD, tx, ty - 6, pd.formattedPrice != null ? pd.formattedPrice : "");

        // Address
        String addr = pd.fullAddress != null ? pd.fullAddress : "";
        if (addr.length() > 52) addr = addr.substring(0, 49) + "…";
        drawText(cv, bf, 8.5f, new BaseColor(160, 160, 175), tx, ty - 24, addr);

        // Date stamp
        drawText(cv, bf, 7, new BaseColor(90, 95, 110), tx, ty - 38,
                "Generated " + LocalDate.now());

        // ── 2. GOLD STATS BAR ─────────────────────────────────────────────────
        final float STATS_H = 36f;
        final float STATS_Y = HEADER_Y - STATS_H;

        fillRect(cv, GOLD, 0, STATS_Y, W, STATS_H);

        List<String[]> stats = buildStats(pd);
        if (!stats.isEmpty()) {
            float sw = W / stats.size();
            for (int i = 0; i < stats.size(); i++) {
                float sx = i * sw;
                if (i > 0) fillRect(cv, new BaseColor(230, 210, 150), sx, STATS_Y, 1, STATS_H);
                drawTextCentered(cv, bfBold, 14, NAVY, sx + sw / 2f, STATS_Y + 17, stats.get(i)[0]);
                drawTextCentered(cv, bf,     7,  new BaseColor(40, 55, 65), sx + sw / 2f, STATS_Y + 6, stats.get(i)[1]);
            }
        }

        // ── 3. BODY ───────────────────────────────────────────────────────────
        final float BODY_TOP    = STATS_Y - 18;
        final float FOOTER_H    = 30f;
        final float BODY_BOTTOM = FOOTER_H + 10;

        final float LEFT_W  = (W - MARGIN * 2) * 0.60f;
        final float LEFT_X  = MARGIN;
        final float RIGHT_W = (W - MARGIN * 2) * 0.38f;
        final float RIGHT_X = MARGIN + (W - MARGIN * 2) * 0.62f;

        float leftY  = BODY_TOP;
        float rightY = BODY_TOP;

        // ── Left: description ────────────────────────────────────────────────
        leftY = drawSectionHeading(cv, bf, bfBold, LEFT_X, leftY, "Property Description") - 6;

        if (pd.description != null && !pd.description.isEmpty()) {
            Font bodyFont = new Font(bf, 9.5f, Font.NORMAL, TEXT);
            ColumnText ct = new ColumnText(cv);
            Paragraph p = new Paragraph(pd.description, bodyFont);
            p.setLeading(14f);
            ct.setSimpleColumn(LEFT_X, BODY_BOTTOM, LEFT_X + LEFT_W, leftY);
            ct.addElement(p);
            ct.go();
            leftY = ct.getYLine() - 12;
        }

        // ── Left: gallery (2nd + 3rd photo) ──────────────────────────────────
        if (pd.photoUrls != null && pd.photoUrls.size() > 1) {
            float photoH = 85f;
            float photoW = (LEFT_W - 6) / 2f;
            for (int i = 1; i < Math.min(pd.photoUrls.size(), 3); i++) {
                try {
                    Image img = Image.getInstance(new URL(pd.photoUrls.get(i)));
                    img.scaleAbsolute(photoW, photoH);
                    img.setAbsolutePosition(LEFT_X + (i - 1) * (photoW + 6), leftY - photoH);
                    doc.add(img);
                } catch (Exception ignored) {}
            }
            leftY -= (photoH + 14);
        }

        // ── Left: amenities ───────────────────────────────────────────────────
        if (pd.amenities != null && !pd.amenities.isEmpty()) {
            leftY = drawSectionHeading(cv, bf, bfBold, LEFT_X, leftY, "Amenities & Features") - 6;
            float tagX = LEFT_X;
            float tagY = leftY;
            float tagH = 16f;

            for (String amenity : pd.amenities) {
                if (amenity == null || amenity.isEmpty()) continue;
                String label = " ✓ " + amenity + " ";
                float tagW = bf.getWidthPoint(label, 8) + 8;
                if (tagX + tagW > LEFT_X + LEFT_W) { tagX = LEFT_X; tagY -= 22; }
                if (tagY < BODY_BOTTOM + 20) break;

                fillRect(cv, CREAM, tagX, tagY - tagH, tagW, tagH);
                cv.setColorStroke(LGRAY);
                cv.setLineWidth(0.4f);
                cv.rectangle(tagX, tagY - tagH, tagW, tagH);
                cv.stroke();
                drawText(cv, bf, 8, MUTED, tagX + 4, tagY - 11, label);
                tagX += tagW + 4;
            }
            leftY = tagY - tagH - 10;
        }

        // ── Left: floor plan ──────────────────────────────────────────────────
        if (pd.floorPlanUrl != null && !pd.floorPlanUrl.isEmpty()) {
            leftY = drawSectionHeading(cv, bf, bfBold, LEFT_X, leftY, "Floor Plan") - 6;
            try {
                Image fp = Image.getInstance(new URL(pd.floorPlanUrl));
                float fpH = Math.min(130f, leftY - BODY_BOTTOM - 10);
                fp.scaleToFit(LEFT_W, fpH);
                fp.setAbsolutePosition(LEFT_X, leftY - fp.getScaledHeight());
                doc.add(fp);
                leftY -= (fp.getScaledHeight() + 10);
            } catch (Exception ignored) {}
        }

        // ── Right: property details table ─────────────────────────────────────
        rightY = drawSectionHeading(cv, bf, bfBold, RIGHT_X, rightY, "Property Details") - 6;

        List<String[]> details = buildDetails(pd);
        float rowH = 20f;
        for (int i = 0; i < details.size(); i++) {
            if (rightY - rowH < BODY_BOTTOM + 80) break;
            fillRect(cv, i % 2 == 0 ? WHITE : CREAM, RIGHT_X, rightY - rowH, RIGHT_W, rowH);
            cv.setColorStroke(LGRAY);
            cv.setLineWidth(0.3f);
            cv.rectangle(RIGHT_X, rightY - rowH, RIGHT_W, rowH);
            cv.stroke();
            drawText(cv, bf,     8, MUTED, RIGHT_X + 5,           rightY - 13, details.get(i)[0]);
            drawText(cv, bfBold, 8, NAVY,  RIGHT_X + RIGHT_W - 6, rightY - 13, details.get(i)[1], PdfContentByte.ALIGN_RIGHT);
            rightY -= rowH;
        }
        rightY -= 14;

        // ── Right: agent card ─────────────────────────────────────────────────
        if (rightY > BODY_BOTTOM + 75) {
            rightY = drawSectionHeading(cv, bf, bfBold, RIGHT_X, rightY, "Listing Agent") - 6;
            float cardH = 72f;
            if (rightY - cardH > BODY_BOTTOM) {
                fillRoundRect(cv, NAVY, RIGHT_X, rightY - cardH, RIGHT_W, cardH, 5);

                // Avatar circle
                float cx = RIGHT_X + 26;
                float cy = rightY - cardH / 2f;
                fillCircle(cv, GOLD, cx, cy, 18);
                String initial = (pd.agentName != null && !pd.agentName.isEmpty())
                        ? String.valueOf(pd.agentName.charAt(0)).toUpperCase() : "A";
                drawTextCentered(cv, bfBold, 13, NAVY, cx, cy - 5, initial);

                // Agent text
                float ax = RIGHT_X + 52;
                drawText(cv, bfBold, 11, WHITE,         ax, rightY - 20, truncate(pd.agentName, 22));
                drawText(cv, bf,      8, new BaseColor(175, 178, 192), ax, rightY - 34, pd.agentPhone != null ? pd.agentPhone : "");
                drawText(cv, bf,      8, new BaseColor(175, 178, 192), ax, rightY - 46, truncate(pd.agentEmail, 26));
                if (pd.agentAgency != null && !pd.agentAgency.isEmpty()) {
                    drawText(cv, bf, 7.5f, GOLD, ax, rightY - 58, pd.agentAgency);
                }
                rightY -= (cardH + 12);
            }
        }

        // ── Right: virtual tour box ───────────────────────────────────────────
        if (pd.virtualTourUrl != null && !pd.virtualTourUrl.isEmpty() && rightY > BODY_BOTTOM + 40) {
            float boxH = 38f;
            fillRoundRect(cv, CREAM, RIGHT_X, rightY - boxH, RIGHT_W, boxH, 4);
            cv.setColorStroke(LGRAY);
            cv.setLineWidth(0.4f);
            cv.roundRectangle(RIGHT_X, rightY - boxH, RIGHT_W, boxH, 4);
            cv.stroke();
            drawText(cv, bfBold, 8, NAVY, RIGHT_X + 8, rightY - 14, "Virtual Tour Available");
            String vtUrl = truncate(pd.virtualTourUrl, 38);
            drawText(cv, bf,     7, MUTED, RIGHT_X + 8, rightY - 26, vtUrl);
        }

        // ── 4. FOOTER ─────────────────────────────────────────────────────────
        fillRect(cv, GOLD, 0, FOOTER_H - 2, W, 2);

        drawText(cv, bfBold, 11, NAVY, MARGIN, 14, "ESTATE");
        drawText(cv, bfBold, 11, GOLD, MARGIN + bf.getWidthPoint("ESTATE", 11), 14, "HUB");

        drawTextCentered(cv, bf, 7, MUTED, W / 2f, 14,
                "This brochure is for informational purposes only. All details subject to verification.");

        drawText(cv, bf, 7, MUTED, W - MARGIN, 14,
                "© " + LocalDate.now().getYear() + " EstateHub",
                PdfContentByte.ALIGN_RIGHT);

        doc.close();
    }

    // ── Layout helpers ────────────────────────────────────────────────────────

    private float drawSectionHeading(PdfContentByte cv, BaseFont bf, BaseFont bfBold,
                                     float x, float y, String title) {
        fillRect(cv, GOLD, x, y - 14, 3, 14);
        drawText(cv, bfBold, 11, NAVY, x + 8, y - 11, title);
        // Underline
        cv.setColorStroke(LGRAY);
        cv.setLineWidth(0.5f);
        cv.moveTo(x, y - 16);
        cv.lineTo(x + (title.equals("Property Description") ? 230f : 170f), y - 16);
        cv.stroke();
        return y - 22;
    }

    private List<String[]> buildStats(PropertyData pd) {
        List<String[]> s = new ArrayList<>();
        if (pd.bedrooms  > 0) s.add(new String[]{String.valueOf(pd.bedrooms),  "BEDS"});
        if (pd.bathrooms > 0) s.add(new String[]{String.valueOf(pd.bathrooms), "BATHS"});
        if (pd.garages   > 0) s.add(new String[]{String.valueOf(pd.garages),   "GARAGES"});
        if (pd.area      > 0) s.add(new String[]{String.format("%,d", pd.area), "SQ FT"});
        if (pd.yearBuilt > 0) s.add(new String[]{String.valueOf(pd.yearBuilt), "BUILT"});
        return s;
    }

    private List<String[]> buildDetails(PropertyData pd) {
        List<String[]> d = new ArrayList<>();
        if (notEmpty(pd.propertyType)) d.add(new String[]{"Type",        cap(pd.propertyType)});
        if (notEmpty(pd.listingType))  d.add(new String[]{"Listing",     "rent".equals(pd.listingType) ? "For Rent" : "For Sale"});
        if (pd.bedrooms  > 0)  d.add(new String[]{"Bedrooms",  String.valueOf(pd.bedrooms)});
        if (pd.bathrooms > 0)  d.add(new String[]{"Bathrooms", String.valueOf(pd.bathrooms)});
        if (pd.garages   > 0)  d.add(new String[]{"Garages",   String.valueOf(pd.garages)});
        if (pd.area      > 0)  d.add(new String[]{"Living Area", String.format("%,d sq ft", pd.area)});
        if (pd.yearBuilt > 0)  d.add(new String[]{"Year Built", String.valueOf(pd.yearBuilt)});
        if (notEmpty(pd.city))  d.add(new String[]{"City",  pd.city});
        if (notEmpty(pd.state)) d.add(new String[]{"State", pd.state});
        if (notEmpty(pd.formattedPrice)) d.add(new String[]{"Price", pd.formattedPrice});
        return d;
    }

    // ── Drawing primitives ────────────────────────────────────────────────────

    private void fillRect(PdfContentByte cv, BaseColor color, float x, float y, float w, float h) {
        cv.setColorFill(color);
        cv.rectangle(x, y, w, h);
        cv.fill();
    }

    private void fillRoundRect(PdfContentByte cv, BaseColor color, float x, float y, float w, float h, float r) {
        cv.setColorFill(color);
        cv.roundRectangle(x, y, w, h, r);
        cv.fill();
    }

    private void fillCircle(PdfContentByte cv, BaseColor color, float cx, float cy, float r) {
        cv.setColorFill(color);
        cv.circle(cx, cy, r);
        cv.fill();
    }

    private void drawText(PdfContentByte cv, BaseFont font, float size, BaseColor color,
                          float x, float y, String text) {
        drawText(cv, font, size, color, x, y, text, PdfContentByte.ALIGN_LEFT);
    }

    private void drawText(PdfContentByte cv, BaseFont font, float size, BaseColor color,
                          float x, float y, String text, int align) {
        if (text == null || text.isEmpty()) return;
        cv.setColorFill(color);
        cv.beginText();
        cv.setFontAndSize(font, size);
        cv.showTextAligned(align, text, x, y, 0);
        cv.endText();
    }

    private void drawTextCentered(PdfContentByte cv, BaseFont font, float size, BaseColor color,
                                  float cx, float y, String text) {
        drawText(cv, font, size, color, cx, y, text, PdfContentByte.ALIGN_CENTER);
    }

    // ── String utilities ──────────────────────────────────────────────────────

    private List<String> wrap(String text, BaseFont font, float size, float maxWidth) {
        List<String> lines = new ArrayList<>();
        if (text == null || text.isEmpty()) return lines;
        String[] words = text.split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String candidate = line.length() == 0 ? word : line + " " + word;
            if (font.getWidthPoint(candidate, size) <= maxWidth) {
                line = new StringBuilder(candidate);
            } else {
                if (line.length() > 0) lines.add(line.toString());
                line = new StringBuilder(word);
                if (lines.size() >= 2) break; // max 2 lines in header
            }
        }
        if (line.length() > 0) lines.add(line.toString());
        return lines;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private boolean notEmpty(String s) { return s != null && !s.isEmpty(); }

    private String cap(String s) {
        if (!notEmpty(s)) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }
}
