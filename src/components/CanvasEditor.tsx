import { useEffect, useRef, useState } from 'react';
import { AlignLeft, Circle, Copy, Image, Layers3, Minus, MousePointer2, Plus, RectangleHorizontal, Square, Trash2, Type, WandSparkles } from 'lucide-react';
import type { CanvasLayer } from '../types';

interface Props { layers: CanvasLayer[]; frame: { width: number; height: number; color: string }; saving: 'saved' | 'saving' | 'error'; selectedId: string | null; readOnly: boolean; onSelect: (id: string | null) => void; onUpdate: (id: string, patch: Partial<CanvasLayer>) => void; onFrameUpdate: (patch: Partial<Props['frame']>) => void; onAdd: (kind: CanvasLayer['kind'], source?: CanvasLayer) => void; onDelete: (id: string) => void; }

export function CanvasEditor({ layers, frame, saving, selectedId, readOnly, onSelect, onUpdate, onFrameUpdate, onAdd, onDelete }: Props) {
  const [zoom, setZoom] = useState(0.82);
  const [device, setDevice] = useState<'Desktop' | 'Mobile'>('Desktop');
  const [inspectorTab, setInspectorTab] = useState<'layers' | 'design'>('layers');
  const drag = useRef<{ id: string; x: number; y: number; originX: number; originY: number } | null>(null);
  const selected = layers.find(layer => layer.id === selectedId);

  useEffect(() => {
    function move(event: PointerEvent) {
      if (!drag.current) return;
      const current = drag.current;
      onUpdate(current.id, { x: Math.max(0, Math.round(current.originX + (event.clientX - current.x) / zoom)), y: Math.max(0, Math.round(current.originY + (event.clientY - current.y) / zoom)) });
    }
    function end() { drag.current = null; }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
  }, [onUpdate, zoom]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>, layer: CanvasLayer) {
    if (readOnly) return;
    event.stopPropagation(); onSelect(layer.id);
    drag.current = { id: layer.id, x: event.clientX, y: event.clientY, originX: layer.x, originY: layer.y };
  }

  return <div className="canvas-editor">
    <div className="canvas-toolbar">
      <div className="tool-palette"><button className="tool-active" title="Select and move"><MousePointer2 size={16} /></button><span className="toolbar-divider" /><button title="Add a text layer" disabled={readOnly} onClick={() => onAdd('text')}><Type size={16} /></button><button title="Add a button" disabled={readOnly} onClick={() => onAdd('button')}><RectangleHorizontal size={16} /></button><button title="Add a card" disabled={readOnly} onClick={() => onAdd('card')}><Square size={16} /></button><button title="Add a shape" disabled={readOnly} onClick={() => onAdd('circle')}><Circle size={16} /></button><button title="Add an image placeholder" disabled={readOnly} onClick={() => onAdd('image')}><Image size={16} /></button></div>
      <div className="canvas-toolbar-right"><select aria-label="Device frame" value={device} onChange={e => setDevice(e.target.value as 'Desktop' | 'Mobile')}><option>Desktop</option><option>Mobile</option></select><span className="toolbar-divider" /><button title="Zoom out" onClick={() => setZoom(z => Math.max(.45, +(z - .1).toFixed(2)))}><Minus size={15} /></button><span className="zoom-value">{Math.round(zoom * 100)}%</span><button title="Zoom in" onClick={() => setZoom(z => Math.min(1.25, +(z + .1).toFixed(2)))}><Plus size={15} /></button></div>
    </div>
    <div className="canvas-area" onPointerDown={() => onSelect(null)}>
      <div className={`canvas-frame ${device === 'Mobile' ? 'device-mobile' : ''}`} style={{ width: device === 'Mobile' ? 390 : frame.width, height: device === 'Mobile' ? 600 : frame.height, background: frame.color, transform: `scale(${zoom})` }} onPointerDown={e => e.stopPropagation()}>
        {layers.map(layer => <div key={layer.id} className={`canvas-layer layer-${layer.kind} ${selectedId === layer.id ? 'layer-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selectedId === layer.id} aria-label={`${layer.name}${selectedId === layer.id ? ', selected' : ''}`} onPointerDown={e => startDrag(e, layer)} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect(layer.id); return; }
          if (readOnly) return;
          const delta = event.shiftKey ? 10 : 1;
          const moves: Record<string, Partial<CanvasLayer>> = { ArrowLeft: { x: Math.max(0, layer.x - delta) }, ArrowRight: { x: layer.x + delta }, ArrowUp: { y: Math.max(0, layer.y - delta) }, ArrowDown: { y: layer.y + delta } };
          const patch = moves[event.key];
          if (patch) { event.preventDefault(); event.stopPropagation(); onSelect(layer.id); onUpdate(layer.id, patch); }
        }} onClick={e => { e.stopPropagation(); onSelect(layer.id); }} style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height, background: layer.kind === 'text' || layer.kind === 'line' ? 'transparent' : layer.fill, color: layer.color, fontSize: layer.fontSize, borderRadius: layer.kind === 'circle' ? '50%' : layer.radius, opacity: layer.opacity / 100 }}>
          {layer.kind === 'text' && <span className="layer-text">{layer.text}</span>}
          {layer.kind === 'button' && <span>{layer.text}</span>}
          {layer.kind === 'image' && <span className="image-placeholder"><span className="mountain-shape" /><small>IMAGE · DROP A MOMENT HERE</small></span>}
          {layer.kind === 'circle' && <span className="circle-highlight" />}
          {layer.kind === 'line' && <span className="line-preview" />}
        </div>)}
        {layers.length === 0 && <div className="canvas-empty"><WandSparkles size={21} /><span>Choose a tool to place your first element.</span></div>}
      </div>
    </div>
    <div className="canvas-statusbar" role="status"><span><span className={`status-dot ${saving === 'saved' ? 'green' : saving === 'saving' ? 'amber' : 'red'}`} /> {saving === 'saved' ? 'All changes saved' : saving === 'saving' ? 'Saving changes…' : 'Changes not saved'}</span><span>Frame · {device === 'Mobile' ? '390 × 600' : `${frame.width} × ${frame.height}`}</span><span>Oriva canvas</span></div>
    <aside className="inspector-panel">
      <div className="inspector-tabs"><button className={inspectorTab === 'layers' ? 'selected' : ''} onClick={() => setInspectorTab('layers')}><Layers3 size={15} /> Layers</button><button className={inspectorTab === 'design' ? 'selected' : ''} onClick={() => setInspectorTab('design')}><AlignLeft size={15} /> Design</button></div>
      {inspectorTab === 'design' ? <div className="properties-panel"><div className="inspector-title">CANVAS <span>FRAME</span></div><label className="property-label">Width<input type="number" min="240" max="2400" value={frame.width} disabled={readOnly} onChange={e => onFrameUpdate({ width: Math.max(240, Math.min(2400, Number(e.target.value) || 240)) })} /></label><label className="property-label">Height<input type="number" min="240" max="2400" value={frame.height} disabled={readOnly} onChange={e => onFrameUpdate({ height: Math.max(240, Math.min(2400, Number(e.target.value) || 240)) })} /></label><div className="property-section-label">BACKGROUND</div><label className="color-row"><input type="color" value={validColor(frame.color) ? frame.color : '#f5f3ee'} disabled={readOnly} onChange={e => onFrameUpdate({ color: e.target.value })} /><span>{frame.color}</span></label><div className="inspector-hint">Frame settings are saved with this design and used by its shared preview.</div></div> : !selected ? <div className="layers-list"><div className="inspector-title">LAYERS <span>{layers.length}</span></div>{[...layers].reverse().map(layer => <button key={layer.id} className="layer-row" onClick={() => onSelect(layer.id)}><span className={`layer-glyph glyph-${layer.kind}`}><LayerIcon kind={layer.kind} /></span><span>{layer.name}</span></button>)}<div className="inspector-hint"><span className="hint-spark">✳</span> Select a layer to edit its details, or drag it around the canvas.</div></div> : <div className="properties-panel">
        <div className="inspector-title">{selected.kind.toUpperCase()} <span className="property-actions"><button title="Duplicate layer" disabled={readOnly} onClick={() => onAdd(selected.kind, selected)}><Copy size={13} /></button><button title="Delete layer" disabled={readOnly} onClick={() => onDelete(selected.id)}><Trash2 size={13} /></button></span></div>
        <label className="property-label">Layer name<input value={selected.name} disabled={readOnly} onChange={e => onUpdate(selected.id, { name: e.target.value })} /></label>
        {(selected.kind === 'text' || selected.kind === 'button') && <label className="property-label">Text<textarea rows={selected.kind === 'text' ? 3 : 2} value={selected.text} disabled={readOnly} onChange={e => onUpdate(selected.id, { text: e.target.value })} /></label>}
        <div className="property-section-label">POSITION</div><div className="property-grid"><label>X<input type="number" min="0" value={selected.x} disabled={readOnly} onChange={e => onUpdate(selected.id, { x: Math.max(0, Number(e.target.value)) })} /></label><label>Y<input type="number" min="0" value={selected.y} disabled={readOnly} onChange={e => onUpdate(selected.id, { y: Math.max(0, Number(e.target.value)) })} /></label></div>
        <div className="property-section-label">SIZE</div><div className="property-grid"><label>W<input type="number" min="20" value={selected.width} disabled={readOnly} onChange={e => onUpdate(selected.id, { width: Math.max(20, Number(e.target.value)) })} /></label><label>H<input type="number" min="20" value={selected.height} disabled={readOnly} onChange={e => onUpdate(selected.id, { height: Math.max(20, Number(e.target.value)) })} /></label></div>
        {selected.kind !== 'text' && <><div className="property-section-label">FILL</div><label className="color-row"><input type="color" value={validColor(selected.fill) ? selected.fill : '#ffffff'} disabled={readOnly} onChange={e => onUpdate(selected.id, { fill: e.target.value })} /><span>{selected.fill}</span></label></>}
        <div className="property-section-label">TYPE & OPACITY</div><div className="property-grid"><label>Size<input type="number" min="8" value={selected.fontSize} disabled={readOnly} onChange={e => onUpdate(selected.id, { fontSize: Math.max(8, Number(e.target.value)) })} /></label><label>Opacity<input type="number" min="0" max="100" value={selected.opacity} disabled={readOnly} onChange={e => onUpdate(selected.id, { opacity: Math.min(100, Math.max(0, Number(e.target.value))) })} /></label></div>
        {selected.kind !== 'text' && <><div className="property-section-label">CORNER RADIUS</div><input className="range-control" type="range" min="0" max="48" value={selected.radius} disabled={readOnly} onChange={e => onUpdate(selected.id, { radius: Number(e.target.value) })} /></>}
      </div>}
    </aside>
  </div>;
}

function LayerIcon({ kind }: { kind: CanvasLayer['kind'] }) {
  const Icon = kind === 'text' ? Type : kind === 'button' ? RectangleHorizontal : kind === 'circle' ? Circle : kind === 'image' ? Image : kind === 'line' ? Minus : Square;
  return <Icon size={13} />;
}
function validColor(value: string) { return /^#[0-9a-f]{6}$/i.test(value); }
