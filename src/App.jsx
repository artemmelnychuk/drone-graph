import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const RAW_DATA = [
  { name: "Drone", are_part_of: null, availability_status: 2, notes: "Top-level system. Assembly widely localized in Ukraine." },
  { name: "Airframe / Hull / Chassis", are_part_of: "Drone", availability_status: 2, notes: "Most localized component. Aluminum fully local; carbon fiber parts still depend on imported raw materials." },
  { name: "Aluminum (structural)", are_part_of: "Airframe / Hull / Chassis", availability_status: 2, notes: "Fully localized in Ukraine. Aluminum structures for drones widely produced domestically." },
  { name: "Carbon Fiber (sheets/composites)", are_part_of: "Airframe / Hull / Chassis", availability_status: 0, notes: "Raw carbon fiber still imported. Some progress in producing from filament domestically, but industrial scale absent." },
  { name: "Fiberglass", are_part_of: "Airframe / Hull / Chassis", availability_status: 0, notes: "Critical feedstock not produced at industrial scale in Ukraine; still imported." },
  { name: "Flight Controller", are_part_of: "Drone", availability_status: 1, notes: "Firmware flashing and assembly done in Ukraine. Critical chips still imported. CubePilot Orange (Australia) has no Ukrainian substitute." },
  { name: "MCU (Microcontroller Unit)", are_part_of: "Flight Controller", availability_status: 1, notes: "Sourced from STMicroelectronics (EU). Western alternatives exist but 2-4x more expensive." },
  { name: "IMU / Inertial Sensor", are_part_of: "Flight Controller", availability_status: 1, notes: "TDK InvenSense (Japan) used. Available from Western/Japanese suppliers but costly." },
  { name: "Barometer", are_part_of: "Flight Controller", availability_status: 1, notes: "Infineon Technologies (Germany). EU-sourced; not a Chinese chokepoint." },
  { name: "OSD Chip (AT7456E)", are_part_of: "Flight Controller", availability_status: 0, notes: "Production concentrated exclusively in China. No Western/Japanese substitute. Single largest chip dependency for FPV." },
  { name: "PCB (Printed Circuit Board)", are_part_of: "Flight Controller", availability_status: 0, notes: "Complex multilayer PCBs almost always fabricated in China. SMD soldering done in Ukraine. Domestic fab requires multi-year 8-figure investment." },
  { name: "Electronic Speed Controller (ESC)", are_part_of: "Drone", availability_status: 1, notes: "Most ESCs sourced from China. Some assembled in Ukraine. MOSFETs and regulators from China/Taiwan; Western alternatives at 5-7x cost." },
  { name: "MOSFET", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 0, notes: "Mass production in China/Taiwan. Western alternatives (TI, Infineon) exist but $0.20-0.30 CN vs $1-1.50 Western. Not feasible to localize." },
  { name: "Voltage Regulator", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 0, notes: "Predominantly Chinese/Taiwanese origin. Infineon (DE) alternatives available at significant price premium." },
  { name: "Quartz Resonator", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 0, notes: "Mass production in China/Taiwan. Murata (Japan) alternative exists at high cost. Requires semiconductor fab to localize." },
  { name: "JST Connector", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 0, notes: "Chinese: $0.05-0.10 each. Molex (USA) or Hirose (Japan): >$0.50 each — prohibitive at drone production volumes." },
  { name: "Thermal Camera (assembled)", are_part_of: "Drone", availability_status: 2, notes: "4 Ukrainian producers: Odd Systems, SeekUAV, Oko Camera, Ochi Nochi. Price-competitive with Chinese models." },
  { name: "Thermal Sensor / IR Detector", are_part_of: "Thermal Camera (assembled)", availability_status: 0, notes: "China controls >80% of global germanium production (key material). Cannot be fully eliminated from supply chain." },
  { name: "Camera Lens (optical)", are_part_of: "Thermal Camera (assembled)", availability_status: 0, notes: "Chinese lenses dominate due to germanium supply. US lenses available but raise costs. Core bottleneck." },
  { name: "FPV Camera", are_part_of: "Drone", availability_status: 0, notes: "Largely imported from China (DJI, CADDX). ~90% of thermal imagers sold in Ukraine are Chinese." },
  { name: "Antenna", are_part_of: "Drone", availability_status: 2, notes: "Ukrainian firms (2E, Otaman, Piranha-Tech) fabricate locally. Limited by lack of anechoic test chambers. PCB antennas still often ordered from China." },
  { name: "VTX (Video Transmitter)", are_part_of: "Drone", availability_status: 2, notes: "Several Ukrainian teams produce analog VTX domestically (DEC-1 2.5W VTX). Integrated by local airframe makers." },
  { name: "Radio / Datalink", are_part_of: "Drone", availability_status: 1, notes: "High-end MANET radios fully imported (Silvus, DTC, Persistent Systems). HIMERA G1 Pro is fully Ukrainian." },
  { name: "RF Front-End (FEM/PA/LNA)", are_part_of: "Radio / Datalink", availability_status: 0, notes: "Power amplifiers, low-noise amplifiers still largely imported. Requires advanced semiconductor process to localize." },
  { name: "SAW/BAW Filter", are_part_of: "Radio / Datalink", availability_status: 0, notes: "Precision RF filters imported. No domestic production feasible in near term." },
  { name: "Secure-Element Chip", are_part_of: "Radio / Datalink", availability_status: 0, notes: "Used for key storage and device authentication. Fully imported; no domestic production." },
  { name: "Digital Radio Chipset", are_part_of: "Radio / Datalink", availability_status: 0, notes: "Used in low-latency links. Fully imported. No domestic production path." },
  { name: "Optical Fiber", are_part_of: "Drone", availability_status: 0, notes: "Fiber imported; domestic firms assemble reels and 25-30km spools. Fiber draw tower requires multi-year 8-figure investment." },
  { name: "Media Converter (fiber-optic)", are_part_of: "Drone", availability_status: 0, notes: "Only one domestic producer. Most units based on Chinese reference designs. Critical vulnerability for fiber-tethered drones." },
  { name: "Navigation System (module)", are_part_of: "Drone", availability_status: 1, notes: "Some domestic assembly (LFTX Sokil/Sova, Geometer RTK). Core chipsets still imported." },
  { name: "GNSS Chipset / Receiver", are_part_of: "Navigation System (module)", availability_status: 0, notes: "Imported from China, Belgium (u-blox), USA. 304 shipments from 67 suppliers as of mid-2025. No domestic chip fab." },
  { name: "MEMS / IMU Sensor", are_part_of: "Navigation System (module)", availability_status: 1, notes: "STMicroelectronics (EU), Bosch (DE), Analog Devices (US), TDK/InvenSense (JP). Western sources available but no domestic production." },
  { name: "Battery Pack (assembled)", are_part_of: "Drone", availability_status: 2, notes: "Domestic assembly established (Wild Hornets, Pawell, Accum Systems). Uses Samsung 50S, Westinghouse, Molicel cells. $90-130 each." },
  { name: "Li-ion / LiPo Cell", are_part_of: "Battery Pack (assembled)", availability_status: 0, notes: "Full dependence on imports. China (CATL) holds 85% global EV cell capacity. No domestic production possible due to missing chemical industry." },
  { name: "Lithium Salts (raw material)", are_part_of: "Li-ion / LiPo Cell", availability_status: 0, notes: "Core battery chemistry input. No domestic production. China dominates processing. Top strategic chokepoint." },
  { name: "Battery Management System (BMS)", are_part_of: "Battery Pack (assembled)", availability_status: 2, notes: "Ukrainian producers standardized BMS during 2023. Largely software/electronics assembly — more localizable than cells." },
  { name: "Electric Motor (brushless DC)", are_part_of: "Drone", availability_status: 2, notes: "Motor-G (Ukraine) launched mass production Dec 2024, ~100k/month. Largest drone motor plant in Europe. Depends on imported magnets and copper." },
  { name: "Neodymium-Iron-Boron Magnet (NdFeB)", are_part_of: "Electric Motor (brushless DC)", availability_status: 0, notes: "China controls 98% of global rare earth refining and >80% NdFeB output. Cannot be localized or substituted. THE single most critical chokepoint." },
  { name: "Copper Wire (motor winding)", are_part_of: "Electric Motor (brushless DC)", availability_status: 1, notes: "Available in Europe but Motor-G still largely imports. Not a Chinese monopoly." },
  { name: "Rare Earth Elements (Nd, Dy, Tb, Sm)", are_part_of: "Neodymium-Iron-Boron Magnet (NdFeB)", availability_status: 0, notes: "China imposed export licensing Apr 2025. Samarium briefly 60x normal price. Ukraine has deposits but they are Russian-occupied." },
  { name: "Internal Combustion Engine (large UAV)", are_part_of: "Drone", availability_status: 1, notes: "Rotax (Austria) for long-range UAVs. Motor Sich (Ukraine) produces for Baykar (AI-450, AI-322F, AI-25TLT). Not Chinese-dependent." },
  { name: "Microelectronics / Chips (general)", are_part_of: "Drone", availability_status: 0, notes: "Broadly imported; almost no domestic semiconductor fabrication. Chinese flight controllers tripled in price by 2024." },
  { name: "Germanium (raw material)", are_part_of: "Thermal Sensor / IR Detector", availability_status: 0, notes: "China controls >80% of global production. Key material for thermal imaging sensors. Strategic export control leverage point." },
];

const STATUS_CONFIG = {
  0: { color: "#ef4444", label: "China-only / Critical", bg: "#7f1d1d" },
  1: { color: "#f59e0b", label: "Partial (some EU)", bg: "#78350f" },
  2: { color: "#22c55e", label: "Produced in Europe/Ukraine", bg: "#14532d" },
};

export default function DroneGraph() {
  const svgRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [filter, setFilter] = useState(new Set([0, 1, 2]));
  const [selectedNode, setSelectedNode] = useState(null);
  const [search, setSearch] = useState("");
  const simulationRef = useRef(null);

  const toggleFilter = (status) => {
    setFilter(prev => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });
  };

  const buildGraph = useCallback(() => {
    const visibleNames = new Set(RAW_DATA.filter(d => filter.has(d.availability_status)).map(d => d.name));
    const nodes = RAW_DATA
      .filter(d => filter.has(d.availability_status))
      .map(d => ({ ...d, id: d.name }));

    const links = RAW_DATA
      .filter(d => d.are_part_of && visibleNames.has(d.name) && visibleNames.has(d.are_part_of))
      .map(d => ({ source: d.are_part_of, target: d.name }));

    return { nodes, links };
  }, [filter]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { nodes, links } = buildGraph();
    const container = svgRef.current.parentElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    svg.attr("width", W).attr("height", H);

    const g = svg.append("g");

    svg.call(
      d3.zoom().scaleExtent([0.15, 3]).on("zoom", e => g.attr("transform", e.transform))
    );

    // Defs: arrowhead
    const defs = svg.append("defs");
    [0, 1, 2].forEach(s => {
      defs.append("marker")
        .attr("id", `arrow-${s}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", STATUS_CONFIG[s].color)
        .attr("opacity", 0.6)
        .attr("d", "M0,-5L10,0L0,5");
    });

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(50));

    simulationRef.current = sim;

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", d => {
        const src = nodes.find(n => n.id === (d.source.id || d.source));
        return src ? STATUS_CONFIG[src.availability_status].color : "#555";
      })
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 1.5)
      .attr("marker-end", d => {
        const src = nodes.find(n => n.id === (d.source.id || d.source));
        return `url(#arrow-${src ? src.availability_status : 0})`;
      });

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    const isRoot = d => d.are_part_of === null;
    const isLeaf = d => !nodes.some(n => n.are_part_of === d.name);

    node.each(function(d) {
      const el = d3.select(this);
      const r = isRoot(d) ? 32 : isLeaf(d) ? 14 : 20;
      d._r = r;

      if (isRoot(d)) {
        // Hexagon for root
        const hex = (r) => d3.range(6).map(i => {
          const a = (i * Math.PI) / 3 - Math.PI / 6;
          return [r * Math.cos(a), r * Math.sin(a)];
        });
        el.append("polygon")
          .attr("points", hex(r).map(p => p.join(",")).join(" "))
          .attr("fill", STATUS_CONFIG[d.availability_status].bg)
          .attr("stroke", STATUS_CONFIG[d.availability_status].color)
          .attr("stroke-width", 2.5);
      } else {
        el.append("circle")
          .attr("r", r)
          .attr("fill", STATUS_CONFIG[d.availability_status].bg)
          .attr("stroke", STATUS_CONFIG[d.availability_status].color)
          .attr("stroke-width", isLeaf(d) ? 1.5 : 2);
      }

      // Glow ring on hover (initially hidden)
      el.append("circle")
        .attr("class", "glow-ring")
        .attr("r", r + 6)
        .attr("fill", "none")
        .attr("stroke", STATUS_CONFIG[d.availability_status].color)
        .attr("stroke-width", 1)
        .attr("opacity", 0);

      const label = el.append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", "#e2e8f0")
        .attr("font-family", "'Courier New', monospace")
        .attr("pointer-events", "none");

      const words = d.name.split(/\s+/);
      const maxCharsPerLine = isRoot(d) ? 9 : isLeaf(d) ? 10 : 11;
      const lines = [];
      let current = "";
      words.forEach(w => {
        if ((current + " " + w).trim().length > maxCharsPerLine && current) {
          lines.push(current);
          current = w;
        } else {
          current = (current + " " + w).trim();
        }
      });
      if (current) lines.push(current);

      const fontSize = isRoot(d) ? 7.5 : isLeaf(d) ? 6 : 6.5;
      const lineH = fontSize * 1.25;
      lines.forEach((line, i) => {
        label.append("tspan")
          .attr("x", 0)
          .attr("dy", i === 0 ? -(lines.length - 1) * lineH / 2 : lineH)
          .attr("font-size", fontSize)
          .attr("font-weight", isRoot(d) ? "bold" : "normal")
          .text(line);
      });
    });

    node
      .on("mouseover", function(e, d) {
        d3.select(this).select(".glow-ring").attr("opacity", 0.6);
        setTooltip({ x: e.clientX, y: e.clientY, data: d });
      })
      .on("mousemove", function(e) {
        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null);
      })
      .on("mouseout", function() {
        d3.select(this).select(".glow-ring").attr("opacity", 0);
        setTooltip(null);
      })
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelectedNode(prev => prev?.name === d.name ? null : d);
      });

    svg.on("click", () => setSelectedNode(null));

    sim.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [buildGraph, filter]);

  // Highlight search
  useEffect(() => {
    if (!svgRef.current) return;
    const lower = search.toLowerCase();
    d3.select(svgRef.current).selectAll("g[cursor='pointer']").each(function(d) {
      const match = lower && d.name.toLowerCase().includes(lower);
      d3.select(this).select("circle, polygon")
        .attr("stroke-width", match ? 4 : d.are_part_of === null ? 2.5 : 2)
        .attr("opacity", lower && !match ? 0.25 : 1);
      d3.select(this).select("text").attr("opacity", lower && !match ? 0.2 : 1);
    });
  }, [search]);

  const counts = { 0: 0, 1: 0, 2: 0 };
  RAW_DATA.forEach(d => counts[d.availability_status]++);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#0a0f1a",
      display: "flex", flexDirection: "column", fontFamily: "'Courier New', monospace",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 20px", borderBottom: "1px solid #1e3a5f",
        display: "flex", alignItems: "center", gap: 20, flexShrink: 0,
        background: "linear-gradient(90deg, #0a0f1a 0%, #0d1b2e 100%)"
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#60a5fa", letterSpacing: 3, textTransform: "uppercase" }}>
            ◈ DRONE SUPPLY CHAIN
          </div>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginTop: 1 }}>
            COMPONENT DEPENDENCY GRAPH — UKRAINE UAS ANALYSIS
          </div>
        </div>

        {/* Search */}
        <input
          placeholder="Search component..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: "#0d1b2e", border: "1px solid #1e3a5f", color: "#94a3b8",
            padding: "5px 10px", fontSize: 10, fontFamily: "inherit",
            borderRadius: 2, outline: "none", width: 200, letterSpacing: 1
          }}
        />

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {[0, 1, 2].map(s => (
            <button key={s} onClick={() => toggleFilter(s)} style={{
              background: filter.has(s) ? STATUS_CONFIG[s].bg : "#0d1b2e",
              border: `1px solid ${filter.has(s) ? STATUS_CONFIG[s].color : "#1e3a5f"}`,
              color: filter.has(s) ? STATUS_CONFIG[s].color : "#475569",
              padding: "4px 10px", cursor: "pointer", fontSize: 9, letterSpacing: 1,
              fontFamily: "inherit", borderRadius: 2, transition: "all 0.2s"
            }}>
              {s === 0 ? "▲ CRITICAL" : s === 1 ? "◆ PARTIAL" : "● LOCALIZED"} ({counts[s]})
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, position: "relative" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: 16, left: 16,
          background: "rgba(10,15,26,0.92)", border: "1px solid #1e3a5f",
          padding: "10px 14px", fontSize: 9, color: "#64748b", lineHeight: 2,
          letterSpacing: 1
        }}>
          <div style={{ color: "#60a5fa", marginBottom: 4, fontWeight: "bold" }}>LEGEND</div>
          {Object.entries(STATUS_CONFIG).map(([s, c]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
              <span style={{ color: "#94a3b8" }}>{c.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, borderTop: "1px solid #1e3a5f", paddingTop: 6 }}>
            <div>⬡ ROOT NODE &nbsp; ● ASSEMBLY &nbsp; · COMPONENT</div>
            <div style={{ marginTop: 3, color: "#334155" }}>Drag nodes · Scroll to zoom · Click for details</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(10,15,26,0.92)", border: "1px solid #1e3a5f",
          padding: "10px 14px", fontSize: 9, color: "#64748b", letterSpacing: 1
        }}>
          <div style={{ color: "#60a5fa", marginBottom: 6, fontWeight: "bold" }}>SUPPLY RISK INDEX</div>
          {[
            ["CRITICAL (China-only)", counts[0], "#ef4444"],
            ["PARTIAL (some EU alt)", counts[1], "#f59e0b"],
            ["LOCALIZED (EU/UA)", counts[2], "#22c55e"],
          ].map(([label, count, color]) => (
            <div key={label} style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 2 }}>
                <span style={{ color: "#94a3b8" }}>{label}</span>
                <span style={{ color }}>{count}</span>
              </div>
              <div style={{ height: 3, background: "#0d1b2e", borderRadius: 2 }}>
                <div style={{ width: `${(count / RAW_DATA.length) * 100}%`, height: "100%", background: color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "fixed", left: tooltip.x + 14, top: tooltip.y - 10,
          background: "#0d1b2e", border: `1px solid ${STATUS_CONFIG[tooltip.data.availability_status].color}`,
          padding: "10px 14px", maxWidth: 300, zIndex: 1000, pointerEvents: "none",
          boxShadow: `0 0 20px ${STATUS_CONFIG[tooltip.data.availability_status].color}33`
        }}>
          <div style={{ color: STATUS_CONFIG[tooltip.data.availability_status].color, fontWeight: "bold", fontSize: 10, marginBottom: 4, letterSpacing: 1 }}>
            {tooltip.data.name}
          </div>
          {tooltip.data.are_part_of && (
            <div style={{ color: "#475569", fontSize: 8, marginBottom: 6, letterSpacing: 1 }}>
              PART OF: {tooltip.data.are_part_of}
            </div>
          )}
          <div style={{ fontSize: 8, color: "#94a3b8", lineHeight: 1.6 }}>
            {tooltip.data.notes}
          </div>
          <div style={{
            marginTop: 8, paddingTop: 6, borderTop: "1px solid #1e3a5f",
            fontSize: 8, color: STATUS_CONFIG[tooltip.data.availability_status].color
          }}>
            STATUS {tooltip.data.availability_status} — {STATUS_CONFIG[tooltip.data.availability_status].label}
          </div>
        </div>
      )}

      {/* Selected node panel */}
      {selectedNode && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "#0d1b2e", border: `1px solid ${STATUS_CONFIG[selectedNode.availability_status].color}`,
          padding: "12px 20px", maxWidth: 500, width: "90%", zIndex: 999,
          boxShadow: `0 0 30px ${STATUS_CONFIG[selectedNode.availability_status].color}22`
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ color: STATUS_CONFIG[selectedNode.availability_status].color, fontWeight: "bold", fontSize: 11, letterSpacing: 1 }}>
              {selectedNode.name}
            </div>
            <button onClick={() => setSelectedNode(null)} style={{
              background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14
            }}>✕</button>
          </div>
          {selectedNode.are_part_of && (
            <div style={{ color: "#475569", fontSize: 9, marginTop: 2, letterSpacing: 1 }}>PART OF: {selectedNode.are_part_of}</div>
          )}
          <div style={{ color: "#94a3b8", fontSize: 9, marginTop: 8, lineHeight: 1.7 }}>{selectedNode.notes}</div>
          <div style={{ marginTop: 8, fontSize: 8, color: STATUS_CONFIG[selectedNode.availability_status].color, letterSpacing: 1 }}>
            ◈ STATUS {selectedNode.availability_status} — {STATUS_CONFIG[selectedNode.availability_status].label.toUpperCase()}
          </div>
          {/* Children */}
          {(() => {
            const children = RAW_DATA.filter(d => d.are_part_of === selectedNode.name);
            return children.length > 0 ? (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 8, color: "#475569", letterSpacing: 1, marginBottom: 6 }}>SUB-COMPONENTS:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {children.map(c => (
                    <span key={c.name} style={{
                      fontSize: 8, padding: "2px 6px", letterSpacing: 0.5,
                      background: STATUS_CONFIG[c.availability_status].bg,
                      color: STATUS_CONFIG[c.availability_status].color,
                      border: `1px solid ${STATUS_CONFIG[c.availability_status].color}55`
                    }}>{c.name}</span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
