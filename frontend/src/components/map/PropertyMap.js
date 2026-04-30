import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import './PropertyMap.css';

// Fix default Leaflet marker icons in CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom gold marker icon
const createCustomIcon = (price, isActive = false) => {
  const priceLabel = price >= 1000000
    ? `$${(price / 1000000).toFixed(1)}M`
    : price >= 1000
    ? `$${Math.round(price / 1000)}K`
    : `$${price}`;

  return L.divIcon({
    className: '',
    html: `
      <div class="map-marker ${isActive ? 'map-marker--active' : ''}">
        <span>${priceLabel}</span>
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 36],
    popupAnchor: [0, -40],
  });
};

// Component to update map bounds when properties change
function MapBoundsUpdater({ properties }) {
  const map = useMap();

  useEffect(() => {
    if (!properties?.length) return;
    const bounds = L.latLngBounds(
      properties.map(p => [p.location.coordinates[1], p.location.coordinates[0]])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [properties, map]);

  return null;
}

const formatPrice = (price, listingType) => {
  const f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  return listingType === 'rent' ? `${f}/mo` : f;
};

export default function PropertyMap({ properties = [], center = [39.5, -98.35], zoom = 4, activeId, onMarkerClick }) {
  const hasProperties = properties.length > 0;
  const mapCenter = hasProperties
    ? [properties[0].location.coordinates[1], properties[0].location.coordinates[0]]
    : center;

  return (
    <div className="property-map">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {hasProperties && <MapBoundsUpdater properties={properties} />}

        {properties.map(property => {
          const [lng, lat] = property.location.coordinates;
          const primaryPhoto = property.photos?.find(p => p.isPrimary)?.url || property.photos?.[0]?.url;
          const isActive = activeId === property._id;

          return (
            <Marker
              key={property._id}
              position={[lat, lng]}
              icon={createCustomIcon(property.price, isActive)}
              eventHandlers={{
                click: () => onMarkerClick?.(property._id),
              }}
            >
              <Popup className="property-popup" maxWidth={260}>
                <Link to={`/properties/${property.slug || property._id}`} className="popup-card">
                  {primaryPhoto && (
                    <div className="popup-img-wrap">
                      <img src={primaryPhoto} alt={property.title} />
                    </div>
                  )}
                  <div className="popup-content">
                    <div className="popup-price">{formatPrice(property.price, property.listingType)}</div>
                    <div className="popup-title">{property.title}</div>
                    <div className="popup-stats">
                      {property.bedrooms > 0 && <span>{property.bedrooms} bed</span>}
                      {property.bathrooms > 0 && <span>{property.bathrooms} bath</span>}
                      {property.area && <span>{property.area.toLocaleString()} ft²</span>}
                    </div>
                    <div className="popup-addr">{property.address?.city}, {property.address?.state}</div>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
