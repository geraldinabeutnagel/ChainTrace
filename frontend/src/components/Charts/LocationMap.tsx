import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  metadata?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    status?: string;
  };
}

interface LocationMapProps {
  locations: LocationData[];
  center?: [number, number];
  zoom?: number;
  showPath?: boolean;
  height?: number;
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

export const LocationMap: React.FC<LocationMapProps> = ({
  locations,
  center,
  zoom = 13,
  showPath = true,
  height = 400
}) => {
  const mapRef = useRef<L.Map>(null);

  // Calculate center if not provided
  const mapCenter: [number, number] = center || (() => {
    if (locations.length === 0) return [0, 0];
    
    const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
    const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
    return [avgLat, avgLng];
  })();

  // Create path coordinates for Polyline
  const pathCoordinates: [number, number][] = locations
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(loc => [loc.latitude, loc.longitude]);

  // Custom marker icon based on status
  const getMarkerIcon = (status?: string) => {
    const color = status === 'alert' ? 'red' : status === 'warning' ? 'orange' : 'blue';
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  return (
    <div className="location-map" style={{ height: `${height}px`, width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render markers for each location */}
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={getMarkerIcon(location.metadata?.status)}
          >
            <Popup>
              <div className="location-popup">
                <h4>Location Details</h4>
                <p><strong>Time:</strong> {new Date(location.timestamp).toLocaleString()}</p>
                <p><strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
                {location.accuracy && (
                  <p><strong>Accuracy:</strong> {location.accuracy}m</p>
                )}
                {location.metadata && (
                  <div className="metadata">
                    <h5>Sensor Data:</h5>
                    {location.metadata.temperature && (
                      <p>Temperature: {location.metadata.temperature}°C</p>
                    )}
                    {location.metadata.humidity && (
                      <p>Humidity: {location.metadata.humidity}%</p>
                    )}
                    {location.metadata.pressure && (
                      <p>Pressure: {location.metadata.pressure} hPa</p>
                    )}
                    {location.metadata.status && (
                      <p>Status: <span className={`status-${location.metadata.status}`}>
                        {location.metadata.status}
                      </span></p>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render path if enabled and we have multiple locations */}
        {showPath && pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
