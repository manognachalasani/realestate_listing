<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ page import="com.realestate.model.PropertyData, java.time.LocalDate, java.time.Year" %>
<%
    PropertyData pd = (PropertyData) request.getAttribute("pd");
    if (pd == null) { response.sendError(500, "Property data missing"); return; }
    pageContext.setAttribute("title",          pd.title);
    pageContext.setAttribute("description",    pd.description);
    pageContext.setAttribute("price",          pd.formattedPrice);
    pageContext.setAttribute("primaryPhotoUrl",pd.primaryPhotoUrl);
    pageContext.setAttribute("photo2Url",      pd.photoUrls != null && pd.photoUrls.size() > 1 ? pd.photoUrls.get(1) : "");
    pageContext.setAttribute("photo3Url",      pd.photoUrls != null && pd.photoUrls.size() > 2 ? pd.photoUrls.get(2) : "");
    pageContext.setAttribute("fullAddress",    pd.fullAddress);
    pageContext.setAttribute("agentName",      pd.agentName);
    pageContext.setAttribute("agentPhone",     pd.agentPhone);
    pageContext.setAttribute("agentEmail",     pd.agentEmail);
    pageContext.setAttribute("amenities",      pd.amenities);
    pageContext.setAttribute("bedrooms",       pd.bedrooms);
    pageContext.setAttribute("bathrooms",      pd.bathrooms);
    pageContext.setAttribute("area",           pd.area);
    pageContext.setAttribute("yearBuilt",      pd.yearBuilt);
    pageContext.setAttribute("garages",        pd.garages);
    pageContext.setAttribute("propertyType",   pd.propertyType);
    pageContext.setAttribute("listingType",    pd.listingType);
    pageContext.setAttribute("virtualTourUrl", pd.virtualTourUrl);
    pageContext.setAttribute("floorPlanUrl",   pd.floorPlanUrl);
    pageContext.setAttribute("today",          LocalDate.now().toString());
    pageContext.setAttribute("currentYear",    Year.now().getValue());
%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — EstateHub Property Brochure</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --gold: #c9a84c;
      --navy: #0f1923;
      --cream: #faf8f4;
      --text: #1a1a2e;
    }
    body {
      font-family: 'DM Sans', sans-serif;
      background: #fff;
      color: var(--text);
      font-size: 14px;
      line-height: 1.6;
    }

    /* Print button (web only) */
    .print-bar {
      background: var(--navy);
      color: #fff;
      padding: 12px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-bar-logo { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #fff; }
    .print-bar-logo strong { color: var(--gold); }
    .print-btn {
      background: var(--gold);
      color: var(--navy);
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    @media print { .print-bar { display: none; } }

    /* Brochure wrapper */
    .brochure {
      max-width: 900px;
      margin: 0 auto;
      padding: 0;
      background: #fff;
    }

    /* Header */
    .brochure-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 380px;
    }
    .header-photo {
      background: var(--navy);
      overflow: hidden;
    }
    .header-photo img { width: 100%; height: 100%; object-fit: cover; }
    .header-info {
      background: var(--navy);
      padding: 40px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .brochure-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      color: rgba(255,255,255,0.9);
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .brochure-logo strong { color: var(--gold); }
    .listing-type-badge {
      display: inline-block;
      background: rgba(201,168,76,0.2);
      border: 1px solid rgba(201,168,76,0.4);
      color: var(--gold);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 100px;
      margin-bottom: 20px;
    }
    .brochure-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 32px;
      color: #fff;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .brochure-price {
      font-family: 'Cormorant Garamond', serif;
      font-size: 36px;
      color: var(--gold);
      font-weight: 600;
      margin-bottom: 12px;
    }
    .brochure-address { color: rgba(255,255,255,0.65); font-size: 14px; }

    /* Quick stats bar */
    .stats-bar {
      display: flex;
      background: var(--gold);
    }
    .stat-b {
      flex: 1;
      text-align: center;
      padding: 14px 8px;
      border-right: 1px solid rgba(255,255,255,0.3);
    }
    .stat-b:last-child { border-right: none; }
    .stat-b-val { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; color: var(--navy); display: block; }
    .stat-b-lbl { font-size: 11px; color: rgba(15,25,35,0.65); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Body */
    .brochure-body { padding: 40px; }

    /* Photo gallery row */
    .photo-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 36px;
    }
    .photo-row img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }

    /* Description */
    .section { margin-bottom: 32px; }
    .section-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 22px;
      color: var(--navy);
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--gold);
      display: inline-block;
    }
    .description-text { color: #444; line-height: 1.85; font-size: 14px; }

    /* Details grid */
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #e8e4dc; border-radius: 6px; overflow: hidden; margin-top: 12px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #e8e4dc; }
    .detail-row:last-child, .detail-row:nth-last-child(2):nth-child(odd) { border-bottom: none; }
    .detail-row:nth-child(even) { background: var(--cream); }
    .detail-key { color: #777; font-size: 13px; }
    .detail-val { font-weight: 600; font-size: 13px; text-transform: capitalize; }

    /* Amenities */
    .amenities-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .amenity-tag {
      padding: 5px 14px;
      background: var(--cream);
      border: 1px solid #e8e4dc;
      border-radius: 100px;
      font-size: 12px;
      color: #555;
    }

    /* Floor plan */
    .floorplan-img { max-width: 100%; border: 1px solid #e8e4dc; border-radius: 6px; margin-top: 12px; }

    /* Virtual tour QR placeholder */
    .vtour-box {
      background: var(--cream);
      border: 1px solid #e8e4dc;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-top: 12px;
    }
    .vtour-icon { font-size: 36px; }
    .vtour-url { font-size: 13px; color: #555; word-break: break-all; }
    .vtour-url a { color: var(--gold); font-weight: 500; }

    /* Agent contact */
    .agent-card {
      background: var(--navy);
      border-radius: 8px;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 12px;
    }
    .agent-avatar {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--gold);
      color: var(--navy);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
      flex-shrink: 0;
    }
    .agent-info { flex: 1; }
    .agent-name { font-family: 'Cormorant Garamond', serif; font-size: 22px; color: #fff; margin-bottom: 6px; }
    .agent-detail { color: rgba(255,255,255,0.65); font-size: 14px; margin-bottom: 3px; }
    .agent-detail strong { color: var(--gold); }

    /* Footer */
    .brochure-footer {
      border-top: 2px solid var(--gold);
      margin-top: 40px;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #888;
      font-size: 12px;
    }
    .footer-logo { font-family: 'Cormorant Garamond', serif; font-size: 16px; color: var(--navy); }
    .footer-logo strong { color: var(--gold); }

    /* Print styles */
    @page { size: A4; margin: 0; }
    @media print {
      body { font-size: 12px; }
      .brochure { max-width: 100%; }
      .brochure-header { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<!-- Web-only print bar -->
<div class="print-bar">
  <div class="print-bar-logo">⌂ ESTATE<strong>HUB</strong></div>
  <div style="display:flex;gap:12px;align-items:center;">
    <span style="color:rgba(255,255,255,0.5);font-size:13px;">Property Brochure</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</div>

<div class="brochure">

  <!-- Header section -->
  <div class="brochure-header">
    <div class="header-photo">
      <c:if test="${not empty primaryPhotoUrl}">
        <img src="${primaryPhotoUrl}" alt="${title}" />
      </c:if>
      <c:if test="${empty primaryPhotoUrl}">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:80px;opacity:0.1;color:#fff;">⌂</div>
      </c:if>
    </div>
    <div class="header-info">
      <div>
        <div class="brochure-logo">⌂ ESTATE<strong>HUB</strong></div>
        <div class="listing-type-badge">${listingType == 'rent' ? 'For Rent' : 'For Sale'} · ${propertyType}</div>
        <h1 class="brochure-title">${title}</h1>
        <div class="brochure-price">${price}</div>
        <div class="brochure-address">📍 ${fullAddress}</div>
      </div>
      <div style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:24px;">
        Generated ${today} · EstateHub.com
      </div>
    </div>
  </div>

  <!-- Stats bar -->
  <div class="stats-bar">
    <c:if test="${bedrooms > 0}">
      <div class="stat-b">
        <span class="stat-b-val">${bedrooms}</span>
        <span class="stat-b-lbl">Bedrooms</span>
      </div>
    </c:if>
    <c:if test="${bathrooms > 0}">
      <div class="stat-b">
        <span class="stat-b-val">${bathrooms}</span>
        <span class="stat-b-lbl">Bathrooms</span>
      </div>
    </c:if>
    <c:if test="${garages > 0}">
      <div class="stat-b">
        <span class="stat-b-val">${garages}</span>
        <span class="stat-b-lbl">Garages</span>
      </div>
    </c:if>
    <c:if test="${area > 0}">
      <div class="stat-b">
        <span class="stat-b-val">${area}</span>
        <span class="stat-b-lbl">Sq Ft</span>
      </div>
    </c:if>
    <c:if test="${yearBuilt > 0}">
      <div class="stat-b">
        <span class="stat-b-val">${yearBuilt}</span>
        <span class="stat-b-lbl">Year Built</span>
      </div>
    </c:if>
  </div>

  <!-- Body -->
  <div class="brochure-body">

    <!-- Secondary photos -->
    <c:if test="${not empty photo2Url or not empty photo3Url}">
      <div class="photo-row">
        <c:if test="${not empty photo2Url}"><img src="${photo2Url}" alt="Photo" /></c:if>
        <c:if test="${not empty photo3Url}"><img src="${photo3Url}" alt="Photo" /></c:if>
      </div>
    </c:if>

    <!-- Description -->
    <div class="section">
      <div class="section-title">Property Description</div>
      <p class="description-text">${description}</p>
    </div>

    <!-- Property Details -->
    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="details-grid">
        <div class="detail-row"><span class="detail-key">Property Type</span><span class="detail-val">${propertyType}</span></div>
        <div class="detail-row"><span class="detail-key">Listing Type</span><span class="detail-val">${listingType}</span></div>
        <c:if test="${bedrooms > 0}"><div class="detail-row"><span class="detail-key">Bedrooms</span><span class="detail-val">${bedrooms}</span></div></c:if>
        <c:if test="${bathrooms > 0}"><div class="detail-row"><span class="detail-key">Bathrooms</span><span class="detail-val">${bathrooms}</span></div></c:if>
        <c:if test="${area > 0}"><div class="detail-row"><span class="detail-key">Living Area</span><span class="detail-val">${area} sq ft</span></div></c:if>
        <c:if test="${yearBuilt > 0}"><div class="detail-row"><span class="detail-key">Year Built</span><span class="detail-val">${yearBuilt}</span></div></c:if>
        <div class="detail-row"><span class="detail-key">Price</span><span class="detail-val">${price}</span></div>
        <div class="detail-row"><span class="detail-key">Address</span><span class="detail-val">${fullAddress}</span></div>
      </div>
    </div>

    <!-- Amenities -->
    <c:if test="${not empty amenities}">
      <div class="section">
        <div class="section-title">Amenities & Features</div>
        <div class="amenities-grid">
          <c:forEach var="amenity" items="${amenities}">
            <span class="amenity-tag">✓ ${amenity}</span>
          </c:forEach>
        </div>
      </div>
    </c:if>

    <!-- Floor Plan -->
    <c:if test="${not empty floorPlanUrl}">
      <div class="section">
        <div class="section-title">Floor Plan</div>
        <img src="${floorPlanUrl}" alt="Floor Plan" class="floorplan-img" />
      </div>
    </c:if>

    <!-- Virtual Tour -->
    <c:if test="${not empty virtualTourUrl}">
      <div class="section">
        <div class="section-title">Virtual Tour</div>
        <div class="vtour-box">
          <div class="vtour-icon">🎬</div>
          <div class="vtour-url">
            Experience this property virtually:<br />
            <a href="${virtualTourUrl}" target="_blank">${virtualTourUrl}</a>
          </div>
        </div>
      </div>
    </c:if>

    <!-- Listing Agent -->
    <div class="section">
      <div class="section-title">Listing Agent</div>
      <div class="agent-card">
        <div class="agent-avatar">
          ${fn:substring(agentName, 0, 1)}
        </div>
        <div class="agent-info">
          <div class="agent-name">${agentName}</div>
          <c:if test="${not empty agentPhone}">
            <div class="agent-detail">📞 <strong>${agentPhone}</strong></div>
          </c:if>
          <c:if test="${not empty agentEmail}">
            <div class="agent-detail">✉️ <strong>${agentEmail}</strong></div>
          </c:if>
        </div>
        <div style="text-align:center;">
          <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:4px;">LISTING BY</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;color:#fff;">⌂ ESTATE<strong style="color:var(--gold);">HUB</strong></div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="brochure-footer">
      <div class="footer-logo">⌂ ESTATE<strong>HUB</strong></div>
      <div>This brochure is for informational purposes only. All details subject to verification.</div>
      <div>© ${currentYear} EstateHub</div>
    </div>

  </div>
</div>

</body>
</html>
