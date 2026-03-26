import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface AutocompleteInputProps {
  placeholder: string;
  defaultValue?: string;
  onPlaceSelected: (place: { name: string, lat: number, lon: number }) => void;
  onChange?: (e: any) => void;
  required?: boolean;
  hotspots?: { name: string, lat: number, lon: number }[];
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ placeholder, defaultValue, onPlaceSelected, onChange, required, hotspots }) => {
  const [query, setQuery] = useState(defaultValue || '');
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external prop changes
  useEffect(() => {
    if (defaultValue !== undefined && defaultValue !== query) {
      setQuery(defaultValue);
    }
  }, [defaultValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      // Don't search if the query is practically empty or dropdown was explicitly closed
      if (query && query.length > 2 && showDropdown) {
        setLoading(true);
        try {
          // Nominatim usage policy requires a unique user-agent or limiting requests, 
          // but for basic client-side demo usage, standard fetch is completely fine.
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          setResults(data);
        } catch (error) {
          console.error("Nominatim fetch error:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, showDropdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowDropdown(true);
    if (onChange) onChange(e);
  };

  const handleSelect = (place: any) => {
    setQuery(place.display_name);
    setShowDropdown(false);
    onPlaceSelected({
      name: place.display_name,
      lat: parseFloat(place.lat),
      lon: parseFloat(place.lon)
    });
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', flex: 1 }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => { setShowDropdown(true); }}
        required={required}
        style={{ width: '100%' }}
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, 
          background: 'white', border: '1px solid var(--border)', borderRadius: '8px', 
          marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto'
        }}>
          {query.length > 2 ? (
            loading ? (
              <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Searching locations...</div>
            ) : results.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {results.map((r, i) => (
                  <li key={i} onClick={() => handleSelect(r)} style={{
                    padding: '10px 14px', borderBottom: i !== results.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.06)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#0ea5e9' }} />
                    <span>{r.display_name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No matching places found</div>
            )
          ) : hotspots && hotspots.length > 0 ? (
            <>
              <div style={{ padding: '8px 14px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                Popular Campus Hotspots
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {hotspots.map((h, i) => (
                  <li key={i} onClick={() => {
                    setQuery(h.name);
                    setShowDropdown(false);
                    onPlaceSelected({ name: h.name, lat: h.lat, lon: h.lon });
                  }} style={{
                    padding: '10px 14px', borderBottom: i !== hotspots.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.06)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>
                      <MapPin size={12} />
                    </span>
                    <span style={{ fontWeight: 500 }}>{h.name}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
