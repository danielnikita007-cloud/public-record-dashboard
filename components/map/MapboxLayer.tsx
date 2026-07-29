'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Case, CaseStatus } from '@/lib/types';
import { coordsForState } from '@/lib/stateCoords';

const STATUS_COLOR: Record<string, string> = {
  alleged: '#8C7A4E',
  under_investigation: '#B8862E',
  court_confirmed: '#3F6B4F',
  closed: '#6b7280',
};

const STATUS_LABEL: Record<string, string> = {
  alleged: 'Alleged',
  under_investigation: 'Under investigation',
  court_confirmed: 'Court confirmed',
  closed: 'Closed',
};

const ALL_STATUSES: CaseStatus[] = ['alleged', 'under_investigation', 'court_confirmed', 'closed'];

interface StatePoint {
  state: string;
  lat: number;
  lng: number;
  cases: Case[];
}

function groupByState(cases: Case[]): StatePoint[] {
  const groups = new Map<string, Case[]>();
  for (const c of cases) {
    const key = c.state || 'Unspecified';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const points: StatePoint[] = [];
  for (const [state, casesInState] of groups) {
    const withCoords = casesInState.find((c) => c.lat && c.lng);
    const coords = withCoords ? [withCoords.lat!, withCoords.lng!] : coordsForState(state);
    if (!coords) continue;
    points.push({ state, lat: coords[0], lng: coords[1], cases: casesInState });
  }
  return points;
}

export default function MapboxLayer({ cases }: { cases: Case[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(ALL_STATUSES));

  const filteredCases = cases.filter((c) => activeStatuses.has(c.status));
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !mapContainer.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [80.9629, 22.5937],
      zoom: 3.6,
    });
    mapRef.current = map;
    return () => map.remove();
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !token) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const points = groupByState(filteredCases);
    const maxCount = Math.max(1, ...points.map((p) => p.cases.length));

    points.forEach((point) => {
      const minSize = 14;
      const maxSize = 52;
      const size = minSize + (point.cases.length / maxCount) * (maxSize - minSize);

      const dominantStatus = point.cases.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topStatus = Object.entries(dominantStatus).sort((a, b) => b[1] - a[1])[0][0];

      const el = document.createElement('div');
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #101826';
      el.style.background = STATUS_COLOR[topStatus] || '#94a3b8';
      el.style.opacity = '0.85';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = '#101826';
      el.style.fontFamily = 'IBM Plex Mono, monospace';
      el.style.fontSize = '11px';
      el.style.fontWeight = '600';
      el.textContent = String(point.cases.length);

      const popupHtml = `
        <strong>${point.state}</strong><br/>
        ${point.cases.length} case${point.cases.length !== 1 ? 's' : ''}<br/>
        ${point.cases.slice(0, 5).map((c) => `<a href="/investigation/${c.id}">${escapeHtml(c.title)}</a>`).join('<br/>')}
        ${point.cases.length > 5 ? `<br/>+${point.cases.length - 5} more` : ''}
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.lng, point.lat])
        .setPopup(new mapboxgl.Popup({ offset: size / 2 + 4 }).setHTML(popupHtml))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [filteredCases, token]);

  function toggleStatus(status: string) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  if (!token) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono h-[200px] flex items-center justify-center text-center">
        Map disabled — add NEXT_PUBLIC_MAPBOX_TOKEN to enable the map.
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono h-[200px] flex flex-col items-center justify-center text-center gap-1">
        <span>No published cases with location data yet.</span>
        <span className="text-ink/30 text-xs">Map activates automatically once cases are approved.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => toggleStatus(status)}
            className={`status-tab border transition-opacity ${
              activeStatuses.has(status) ? 'opacity-100' : 'opacity-30'
            }`}
            style={{
              backgroundColor: `${STATUS_COLOR[status]}22`,
              color: STATUS_COLOR[status],
              borderColor: `${STATUS_COLOR[status]}66`,
            }}
          >
            {STATUS_LABEL[status]}
          </button>
        ))}
      </div>
      <div ref={mapContainer} className="w-full h-[420px] rounded-sm overflow-hidden border border-black/20" />
      <p className="text-[11px] text-paper/40 font-mono mt-2">
        Bubble size = number of cases in that state. Click a bubble for details. Click a status above to filter.
      </p>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
