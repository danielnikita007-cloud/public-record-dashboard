'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Case } from '@/lib/types';

const STATUS_COLOR: Record<string, string> = {
  alleged: '#8C7A4E',
  under_investigation: '#B8862E',
  court_confirmed: '#3F6B4F',
  closed: '#6b7280',
};

export default function MapboxLayer({ cases }: { cases: Case[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return; // no token configured yet — see README
    mapboxgl.accessToken = token;

    if (!mapContainer.current) return;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [78.9629, 22.5937],
      zoom: 3.8,
    });
    mapRef.current = map;

    const withCoords = cases.filter((c) => c.lat && c.lng);
    withCoords.forEach((c) => {
      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #101826';
      el.style.background = STATUS_COLOR[c.status] || '#94a3b8';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat([c.lng!, c.lat!])
        .setPopup(
          new mapboxgl.Popup({ offset: 16 }).setHTML(
            `<strong>${escapeHtml(c.title)}</strong><br/><a href="/investigation/${c.id}">View case →</a>`
          )
        )
        .addTo(map);
    });

    return () => map.remove();
  }, [cases]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono h-[420px] flex items-center justify-center text-center">
        Map disabled — add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to enable the interactive map
        (see README → "Linking data sources").
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-[420px] rounded-sm overflow-hidden border border-black/20" />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
