<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"
         isErrorPage="true" %>
<%
    Integer statusCode  = (Integer)  request.getAttribute("javax.servlet.error.status_code");
    String  errorMsg    = (String)   request.getAttribute("javax.servlet.error.message");
    String  requestUri  = (String)   request.getAttribute("javax.servlet.error.request_uri");

    if (statusCode  == null) statusCode  = 500;
    if (errorMsg    == null) errorMsg    = "An unexpected error occurred.";
    if (requestUri  == null) requestUri  = request.getRequestURI();

    String title = statusCode == 404 ? "Property Not Found" : "Something Went Wrong";
    String icon  = statusCode == 404 ? "🏚️" : "⚠️";
%>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= statusCode %> — EstateHub Brochure</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', serif;
      background: #0f1923;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1a2535;
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: 12px;
      padding: 56px 48px;
      text-align: center;
      max-width: 480px;
    }
    .icon  { font-size: 64px; margin-bottom: 20px; }
    .code  { font-size: 14px; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 12px; }
    h1     { font-size: 28px; margin-bottom: 12px; }
    .msg   { color: rgba(255,255,255,0.55); font-size: 14px; line-height: 1.7; margin-bottom: 32px; }
    .logo  { font-size: 14px; color: rgba(255,255,255,0.3); margin-top: 40px; letter-spacing: 1px; }
    .logo strong { color: #c9a84c; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><%= icon %></div>
    <div class="code">Error <%= statusCode %></div>
    <h1><%= title %></h1>
    <p class="msg"><%= errorMsg %></p>
    <p class="logo">⌂ ESTATE<strong>HUB</strong></p>
  </div>
</body>
</html>
