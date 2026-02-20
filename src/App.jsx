import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const RAW_DATA = [
  { name: "Drone", are_part_of: null, availability_status: 2, ukraine_production_now: 60, ukraine_production_potential: 80, resources_in_europe: "partial", notes: "Top-level system. Assembly widely localized in Ukraine." },
  { name: "Airframe / Hull / Chassis", are_part_of: "Drone", availability_status: 2, ukraine_production_now: 85, ukraine_production_potential: 95, resources_in_europe: "yes", resources_needed: [], notes: "85%+ of manufacturers produce domestically or source from Ukrainian firms. Taken up by established civilian manufacturers (plastics, aluminum, goods) who expanded into drones. Domestic airframes are priced HIGHER than Chinese imports, and capacity is still insufficient — scaling investment essential." },
  { name: "Aluminum (structural)", are_part_of: "Airframe / Hull / Chassis", availability_status: 2, ukraine_production_now: 90, ukraine_production_potential: 100, resources_in_europe: "yes", resources_needed: [], notes: "Civilian aluminum manufacturers pivoted to drone frames. Structural fabrication is fully domestic. Raw aluminum ingot is still imported but this does not affect the localization of the finished structural components." },
  { name: "Carbon Fiber (sheets/composites)", are_part_of: "Airframe / Hull / Chassis", availability_status: 1, ukraine_production_now: 20, ukraine_production_potential: 70, resources_in_europe: "partial", resources_needed: ["Polyacrylonitrile (PAN) precursor fiber — dominated by Japan/China", "Carbon fiber oxidation & carbonization furnaces — specialized capex", "Epoxy resin binders — partially available in EU"], notes: "Ukraine depends on imported carbon composites and alloys. Some manufacturers have developed competencies including producing carbon fiber from filament — partial domestic progress, not yet at industrial scale." },
  { name: "Fiberglass", are_part_of: "Airframe / Hull / Chassis", availability_status: 1, ukraine_production_now: 5, ukraine_production_potential: 60, resources_in_europe: "partial", resources_needed: ["Silica sand (available in EU)", "E-glass fiber spinning capacity — very limited in EU", "Resin systems (epoxy/polyester) — partially EU-available"], notes: "Not produced at industrial scale in Ukraine or the EU at drone-relevant volumes, but EU producers exist (e.g. Owens Corning). Primarily sourced from China and Asia for cost reasons — not a China-exclusive supply chain." },
  { name: "Propeller Blades", are_part_of: "Airframe / Hull / Chassis", availability_status: 2, ukraine_production_now: 80, ukraine_production_potential: 95, resources_in_europe: "yes", resources_needed: [], notes: "Initially imported from China as part of commercial kits. Now largely localized alongside frame production in Ukrainian workshops. China still cheaper at scale." },
  { name: "Steel Plating (ground drones)", are_part_of: "Airframe / Hull / Chassis", availability_status: 2, ukraine_production_now: 95, ukraine_production_potential: 100, resources_in_europe: "yes", resources_needed: [], notes: "Ground drones use armored tracked/wheeled chassis locally built with steel plating adapted from civilian industries. Fully localized." },
  { name: "Flight Controller", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 50, ukraine_production_potential: 75, resources_in_europe: "partial", resources_needed: ["OSD chip (AT7456E) — no EU/JP producer exists", "Multilayer PCB fabrication capacity — requires photolithography investment", "Power/auxiliary electronics (MOSFETs, regulators) — technically EU-available but 5-7x cost"], notes: "Assembly and firmware flashing done in Ukraine (Wild Hornets, Vyriy, Tykho). ESC segment is more China-dominant than FCs — FCs have Chinese + EU + Ukrainian options. CubePilot Orange (Australia) has no Ukrainian substitute but AU origin reduces urgency. Vyriy and Wild Hornets claim full Ukrainian assembly of FCs." },
  { name: "MCU (Microcontroller Unit)", are_part_of: "Flight Controller", availability_status: 2, ukraine_production_now: 70, ukraine_production_potential: 90, resources_in_europe: "yes", resources_needed: [], notes: "STMicroelectronics (EU) is the actual supplier used by Ukrainian producers (Tykho, Vyriy). EU-sourced and price-competitive at drone production volumes — no China scale economics advantage for this component class." },
  { name: "IMU / Inertial Sensor", are_part_of: "Flight Controller", availability_status: 1, ukraine_production_now: 60, ukraine_production_potential: 85, resources_in_europe: "partial", resources_needed: ["MEMS fabrication cleanroom capacity — limited in EU at drone-relevant scale", "Precision MEMS calibration infrastructure"], notes: "TDK InvenSense (Japan) used by Ukrainian producers. Western-sourced by design choice. The 2-4x price premium applies to power electronics (MOSFETs etc.), not specifically to IMUs." },
  { name: "Magnetometer", are_part_of: "Flight Controller", availability_status: 2, ukraine_production_now: 70, ukraine_production_potential: 90, resources_in_europe: "yes", resources_needed: [], notes: "STMicroelectronics (EU) is the confirmed supplier. Price-competitive — magnetometers are not a high-volume commodity where China holds a scale advantage." },
  { name: "Barometer", are_part_of: "Flight Controller", availability_status: 2, ukraine_production_now: 75, ukraine_production_potential: 95, resources_in_europe: "yes", resources_needed: [], notes: "Infineon Technologies (Germany) is the confirmed supplier, price-competitive at drone production volumes. No China scale economics issue for this component." },
  { name: "OSD Chip (AT7456E)", are_part_of: "Flight Controller", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 20, resources_in_europe: "no", resources_needed: ["Dedicated OSD ASIC design — no EU/JP firm produces this niche chip", "Semiconductor fab node (130-180nm) — technically exists in EU but no commercial interest", "FPGA alternative (Xilinx/Intel EU) — exists but 10-20x cost, integration complexity"], notes: "Production concentrated exclusively in China. Most common chip in drone construction, standard for FPV. Western/Japanese firms do not produce OSD controllers — niche segment with low global demand. FPGA alternatives exist in EU/US but are much more expensive and harder to integrate." },
  { name: "PCB (Printed Circuit Board)", are_part_of: "Flight Controller", availability_status: 1, ukraine_production_now: 15, ukraine_production_potential: 50, resources_in_europe: "partial", resources_needed: ["Low-loss RF laminate materials (Rogers, Isola — US-available, limited in EU)", "Photolithography lines for multilayer — requires 8-figure investment", "Precision chemical etching processes — ecosystem largely absent in Ukraine"], notes: "Complex multilayer boards almost always fabricated in China. SMD soldering and final assembly performed in Ukraine. Requires semiconductor fabrication ecosystem and photolithography lines to localize — does not currently exist domestically." },
  { name: "Electronic Speed Controller (ESC)", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 15, ukraine_production_potential: 55, resources_in_europe: "partial", notes: "More China-dominant than flight controllers — most ready-made ESC solutions are Chinese brands. Some assembly/firmware flashing in Ukraine (Vyriy, Wild Hornets) but this is early-stage. MOSFETs, regulators, connectors remain Chinese/Taiwanese; Western alternatives at 5-7x cost." },
  { name: "Initiation Boards", are_part_of: "Drone", availability_status: 2, ukraine_production_now: 65, ukraine_production_potential: 90, resources_in_europe: "partial", notes: "Vyriy Drone announced Ukrainian-made initiation boards as part of a batch of 1,000 FPV drones with fully local components." },
  { name: "MOSFET", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 20, resources_in_europe: "partial", notes: "Mass production in China/Taiwan. Western alternatives (TI, Infineon) exist but $0.20-0.30 CN vs $1-1.50 Western — 5-7x cost gap. Requires semiconductor fabrication ecosystem to localize; does not exist in Ukraine." },
  { name: "Voltage Regulator", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 20, resources_in_europe: "partial", notes: "Predominantly Chinese/Taiwanese origin. Infineon (DE) alternatives available at significant price premium. Same semiconductor fab barrier as MOSFETs." },
  { name: "Quartz Resonator", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 15, resources_in_europe: "partial", notes: "Mass production in China/Taiwan. Murata (Japan) alternative exists at high cost premium. Requires precision chemical processes and semiconductor fab to localize — not present in Ukraine." },
  { name: "JST Connector", are_part_of: "Electronic Speed Controller (ESC)", availability_status: 1, ukraine_production_now: 5, ukraine_production_potential: 50, resources_in_europe: "yes", notes: "Chinese: $0.05-0.10 each. Molex (USA) or Hirose (Japan): >$0.50 each — 5-10x cost gap prohibitive at drone production volumes. Technically localizable but economics make it impractical without industrial-scale investment." },
  { name: "Thermal Camera (assembled)", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 10, ukraine_production_potential: 60, resources_in_europe: "partial", notes: "4 Ukrainian producers: Odd Systems (Kurbas-256, Kurbas-640-Alpha), SeekUAV (SeekUAV-256), Oko Camera, Ochi Nochi. Kurbas-256 and SeekUAV-256 are price-competitive with CADDX-256 and cheaper at volume. Oko Camera deployed on Skyfall Vampire UAV; Kurbas-640-Alpha used in interceptor drones vs Russian/Iranian UAVs. However ~90% of thermal imagers sold in Ukraine are still Chinese — localized production is a very small share of the market. Key advantage: domestic producers iterate fast on frontline feedback (e.g. in-flight contrast adjustment)." },
  { name: "Thermal Sensor / IR Detector", are_part_of: "Thermal Camera (assembled)", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 15, resources_in_europe: "no", notes: "Odd Systems and SeekUAV rely on sensors manufactured in China. Oko Camera follows 'China-less' policy and attempts EU/US sourcing for circuit board microcomponents, but explicitly states it is impossible to completely eliminate Chinese components in the sensor area. Germanium dependency is the root cause." },
  { name: "Camera Lens (optical)", are_part_of: "Thermal Camera (assembled)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 30, resources_in_europe: "partial", notes: "Odd Systems and SeekUAV rely on lenses manufactured in China. SeekUAV actively trying to source American lenses as alternative, but this raises camera prices. Large investments would be required to produce lenses on-site. Separate issue from sensors — not directly caused by germanium." },
  { name: "Camera PCB Microcomponents", are_part_of: "Thermal Camera (assembled)", availability_status: 1, ukraine_production_now: 30, ukraine_production_potential: 70, resources_in_europe: "yes", notes: "Oko Camera explicitly tries to source circuit board microcomponents from Europe and the United States as part of its 'China-less' policy. Partially achievable but China still cheaper at scale." },
  { name: "Electro-optical (EO) / FPV Camera", are_part_of: "Drone", availability_status: 0, ukraine_production_now: 5, ukraine_production_potential: 40, resources_in_europe: "partial", notes: "Standard video and FPV cameras (GoPro-style action cameras, DJI, CADDX). Initially almost entirely imported from China. No significant localization — distinct from thermal cameras where Ukrainian producers have emerged." },
  { name: "Germanium (raw material)", are_part_of: "Thermal Sensor / IR Detector", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "China controls >80% of global germanium production, enabling much lower prices for thermal sensor products. Root cause of thermal sensor dependency. No realistic European alternative at scale." },
  { name: "Antenna", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 50, ukraine_production_potential: 80, resources_in_europe: "yes", notes: "Ukrainian firms (2E, Otaman, Piranha-Tech) fabricate whips, patches, and PCB-based antennas with domestic mounts and housings. Key limit: few full-size anechoic chambers — producers rely on improvised rigs, slowing repeatable performance gains. In practice many PCB antennas still ordered from Chinese labs for price and turnaround even when designed locally." },
  { name: "VTX (Video Transmitter)", are_part_of: "Drone", availability_status: 2, ukraine_production_now: 70, ukraine_production_potential: 90, resources_in_europe: "partial", notes: "Ukraine handles design, assembly, enclosure manufacture, harnessing, and ground-kit integration domestically. DEC-1 2.5W VTX is stocked by Ukrainian retailers and integrated by local airframe makers. Does not replace top-tier Western MANET radios but reduces exposure to opaque foreign stacks." },
  { name: "Radio / Datalink", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 25, ukraine_production_potential: 55, resources_in_europe: "partial", notes: "HIMERA G1 Pro is designed and built in Ukraine (handheld tactical radio, in repeat production). High-end MANET radios fully imported: Silvus StreamCaster (US), DTC SOLO8 (UK), Persistent Systems Wave Relay (US). COTS FPV dominated by China (RushFPV, Foxeer, DJI O3/OcuSync, Walksnail/Avatar, HDZero) and Switzerland (ImmersionRC). Chinese comms systems (e.g. DJI) can be remotely disabled, use closed protocols that block customization, and may allow manipulation of transmitted video or telemetry — a direct operational security risk." },
  { name: "MANET Radio (high-end)", are_part_of: "Radio / Datalink", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 20, resources_in_europe: "partial", notes: "Silvus StreamCaster (US), DTC SOLO8 (UK), Persistent Systems Wave Relay (US). All fielded for low-latency C2/video under EW pressure. No Ukrainian or EU substitute exists. Not a China dependency but a Western import dependency." },
  { name: "RF Front-End (FEM/PA/LNA)", are_part_of: "Radio / Datalink", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 15, resources_in_europe: "partial", notes: "Power amplifiers, low-noise amplifiers, integrated FEMs. Western alternatives exist (Qorvo US, Skyworks US, Infineon DE) but sourcing for Ukraine is constrained by export controls and cost. Requires advanced semiconductor fabrication to localize in EU/Ukraine." },
  { name: "SAW/BAW Filter", are_part_of: "Radio / Datalink", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "partial", notes: "Precision RF filters. Murata (JP), TDK (JP), Qorvo (US) produce alternatives — not China-exclusive. Multi-year investment in process control and calibrated test capacity required to build in EU/Ukraine." },
  { name: "Secure-Element Chip", are_part_of: "Radio / Datalink", availability_status: 2, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "partial", notes: "Used for key storage and device authentication. NXP (NL) and Infineon (DE) are EU producers, price-competitive — secure element chips are not a high-volume commodity where China dominates on scale. EU sourcing is feasible and standard practice." },
  { name: "Digital Radio Chipset", are_part_of: "Radio / Datalink", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "partial", notes: "Used in low-latency links. Western alternatives exist: Qualcomm (US), Texas Instruments (US), Nordic Semiconductor (NO). Layout and assembly increasingly done in Ukraine but silicon still foreign-sourced." },
  { name: "Starlink / Satellite Backhaul", are_part_of: "Drone", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "Starlink LEO terminals provide high-throughput low-latency links for command, telemetry, and payload data. Single-vendor dependency on SpaceX. Periods of interruption for technical, regulatory, or operational reasons have materially undermined operations. Cannot be localized." },
  { name: "Optical Fiber", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 30, ukraine_production_potential: 50, resources_in_europe: "partial", notes: "Raw fiber still imported. However domestic suppliers now mass-produce 25-30km spools and participate in codification trials. Building a domestic fiber draw tower requires multi-year eight-figure investment. Partial localization is real and growing." },
  { name: "Fiber-Optic Reel (assembled)", are_part_of: "Optical Fiber", availability_status: 2, ukraine_production_now: 75, ukraine_production_potential: 90, resources_in_europe: "partial", notes: "Ukrainian firms (3DTech) machine and assemble fiber-optic reels, standardize coil formats, and integrate tether kits on airframes. Mechanical components fully domestic. Active electronics and raw fiber still imported. Enables RF-jamming-resistant tethered drone control path." },
  { name: "Media Converter (fiber-optic)", are_part_of: "Optical Fiber", availability_status: 1, ukraine_production_now: 10, ukraine_production_potential: 40, resources_in_europe: "partial", notes: "Only one domestic producer exists. Western manufacturers exist (Finisar, Lumentum, II-VI — US) but Chinese reference designs dominate due to cost. Mechanical components manufactured locally; active electronics still imported. Not China-exclusive but heavily China-dependent in practice." },
  { name: "Navigation System (module)", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 20, ukraine_production_potential: 45, resources_in_europe: "partial", notes: "Ukraine primarily assembles imported chips into ready-to-integrate modules — no domestic mass production of chipsets or MEMS. LFTX developed Sokil/Sova navigation module and Scout map correction module. Geometer International produces GNSS and RTK receivers. No open-source data on Ukraine-produced IMU systems (gyroscopes, accelerometers)." },
  { name: "GNSS Chipset / Receiver", are_part_of: "Navigation System (module)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "partial", notes: "304 shipments from 67 suppliers as of mid-2025, mostly China, Belgium, and US. Key suppliers: u-blox (Switzerland/Belgium), Broadcom/Qualcomm/Intel (USA), MediaTek (Taiwan), Quectel/Unicore (China). No domestic fab. Building chipset capability requires significant time and investment in fabrication and calibration facilities Ukraine does not currently possess at scale." },
  { name: "MEMS / IMU Sensor", are_part_of: "Navigation System (module)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 15, resources_in_europe: "yes", notes: "Ukraine produces none domestically. Status=1 reflects that Western/Japanese alternatives exist and are used (STMicroelectronics EU, Bosch DE, Qorvo/Analog Devices US, TDK/InvenSense JP) — not a China-only chokepoint. But localization_current=0 reflects zero domestic chip production, only module assembly around foreign silicon." },
  { name: "Gyroscope / Accelerometer", are_part_of: "MEMS / IMU Sensor", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "partial", notes: "No domestic production in Ukraine. Core MEMS components sourced from Western and Asian suppliers (STMicroelectronics EU, Bosch DE, Analog Devices US, TDK JP) — not a China-only chokepoint. Localization requires cleanroom MEMS fabrication capacity that does not exist domestically." },
  { name: "Battery Pack (assembled)", are_part_of: "Drone", availability_status: 2, ukraine_production_now: 70, ukraine_production_potential: 85, resources_in_europe: "partial", notes: "Domestic assembly established by mid-2023 (Wild Hornets, Pawell, Accum Systems). Importing cells rather than assembled packs expanded the supplier pool and eliminated added value on finished products. Standardizing BMS improved reliability vs earlier quality-variable imports. Enables drone-type customization. Wild Hornets uses Samsung 50S (KR) and Westinghouse (US); Pawell uses Samsung cells; Accum Systems uses Molicel (TW). Finished packs $90-130, price-competitive with imports." },
  { name: "Li-ion / LiPo Cell", are_part_of: "Battery Pack (assembled)", availability_status: 1, ukraine_production_now: 0, ukraine_production_potential: 10, resources_in_europe: "no", notes: "Fully imported — no domestic cell production possible due to absent raw materials and chemical industry. China (CATL) dominates with 85% of global EV capacity and controls small high-discharge quadcopter batteries. Viable non-Chinese alternatives actively used: Samsung 50S, Westinghouse, Molicel. In 2024 China sanctioned Skydio (America's largest drone manufacturer) just before the US election, cutting essential battery supplies overnight and forcing Skydio to ration batteries to customers including the US military. Battery supply chain weaponization is an active, demonstrated risk." },
  { name: "Lithium Salts (raw material)", are_part_of: "Li-ion / LiPo Cell", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "Core battery chemistry input. No domestic production. China dominates global processing. Cannot be substituted — top strategic chokepoint for all battery chemistry." },
  { name: "Battery Management System (BMS)", are_part_of: "Battery Pack (assembled)", availability_status: 2, ukraine_production_now: 75, ukraine_production_potential: 95, resources_in_europe: "yes", notes: "Ukrainian producers standardized BMS by mid-2023, directly improving reliability by eliminating the voltage drop failures (overheating, rapid winter discharge) seen with earlier unmanaged imports. Largely electronics assembly and firmware — far more localizable than cells. No Chinese monopoly on BMS components." },
  { name: "Electric Motor (brushless DC)", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 10, ukraine_production_potential: 60, resources_in_europe: "partial", notes: "Motor-G (Ukraine) launched mass production Dec 2024, approaching 100k/month — likely the largest drone motor plant in Europe. Powers FPV and fiber-optic tethered drones up to 15-inch frame. However demand is ~1.6M/month (400k FPV systems × 4 motors each) — a massive gap. Motor-G remains indirectly dependent on Chinese inputs: if magnets, copper, or winding/testing equipment supplies were cut, production would stall. Manufacturers have switched to Ukrainian small motors where possible but still lack domestic alternatives for larger models. Until 2023 Ukraine had zero local motor producers." },
  { name: "Neodymium-Iron-Boron Magnet (NdFeB)", are_part_of: "Electric Motor (brushless DC)", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "China controls 98% of global rare earth refining and >80% of NdFeB output. 2024 output: China ~300,000 tons, US virtually zero. Cannot be substituted — ferrite alternatives are cheap and corrosion-resistant but far too weak for high-performance/weight-sensitive UAS. Both sintered and bonded NdFeB variants rely on the same rare earth inputs processed overwhelmingly in China. In 2024 Vyriy Drone attempted to build FPV drones with fully local components — succeeded on all except magnets, where the firm cited China's global monopoly as an insurmountable constraint. Also used cross-cutting in gimbals, servomotors, magnetic encoders, payload release mechanisms, and throttle sensors." },
  { name: "Bonded NdFeB Magnet", are_part_of: "Neodymium-Iron-Boron Magnet (NdFeB)", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "Newer manufacturing variant: magnetic powder bound with polymer and molded into single-piece multi-pole rings, reducing assembly steps vs sintered. Used in miniature rings/discs for magnetic encoders, stabilizers, and servomotors. Still requires the same Chinese-sourced rare earth alloy powder as sintered NdFeB — no supply chain improvement." },
  { name: "Rare Earth Elements (Nd, Dy, Tb, Sm)", are_part_of: "Neodymium-Iron-Boron Magnet (NdFeB)", availability_status: 0, ukraine_production_now: 0, ukraine_production_potential: 5, resources_in_europe: "no", notes: "China imposed export licensing Apr 2025 on dysprosium, terbium, samarium and others. Samarium at 60x normal price; other inputs 5x. Ukraine has deposits in Azov Upland and Kruta Balka but both Russian-occupied AND mining costs prohibitively high regardless of occupation. Norway's Ulefoss 'invisible mine' project — designed to extract 9 million tons of rare earth oxides, Europe's most promising alternative — but won't begin full-scale operations until 2030. Even if everything proceeds perfectly, meaningful European supply is half a decade away. Ukraine's realistic role: implement rare earth agreement with US, provide military performance feedback, participate in R&D." },
  { name: "Gimbal / Stabilizer", are_part_of: "Drone", availability_status: 0, ukraine_production_now: 10, ukraine_production_potential: 40, resources_in_europe: "no", notes: "Uses bonded NdFeB miniature rings/discs for stabilization. Platforms carrying heavy payloads or requiring stabilization depend on precise magnet-based components here. Localization of the mechanical assembly is possible but magnet dependency cannot be resolved domestically." },
  { name: "Servomotor", are_part_of: "Drone", availability_status: 0, ukraine_production_now: 10, ukraine_production_potential: 35, resources_in_europe: "no", notes: "Uses NdFeB magnets. Appears in gimbals, payload release mechanisms, and control surfaces. Some FPV drones operate sensorless motors but platforms with stabilization or heavy payloads rely on magnet-based servomotors. Assembly localizable; magnet supply is the hard constraint." },
  { name: "Magnetic Encoder", are_part_of: "Drone", availability_status: 0, ukraine_production_now: 5, ukraine_production_potential: 30, resources_in_europe: "no", notes: "High-resolution magnetic encoders use bonded NdFeB discs/rings. Used for precise position sensing in motor control and stabilization systems. Fully dependent on Chinese magnet supply for the core sensing element." },
  { name: "Payload Release Mechanism", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 40, ukraine_production_potential: 60, resources_in_europe: "no", notes: "Mechanical assembly and housing can be locally produced. Uses NdFeB magnets in the release actuation. Mechanical localization is achievable; magnet supply remains the constraint on full independence." },
  { name: "Copper Wire (motor winding)", are_part_of: "Electric Motor (brushless DC)", availability_status: 2, ukraine_production_now: 20, ukraine_production_potential: 85, resources_in_europe: "yes", notes: "Standard industrial commodity. EU/global suppliers fully price-competitive — no China scale economics advantage here. Motor-G currently imports but EU sourcing is straightforward. Primary barrier is procurement habit, not price or availability." },
  { name: "Motor Winding / Testing Equipment", are_part_of: "Electric Motor (brushless DC)", availability_status: 1, ukraine_production_now: 5, ukraine_production_potential: 40, resources_in_europe: "partial", notes: "Specialized winding and testing machines for motor production largely come from China or other foreign sources. EU/Western alternatives exist but China dominates at scale and price." },
  { name: "Internal Combustion Engine (large UAV)", are_part_of: "Drone", availability_status: 1, ukraine_production_now: 30, ukraine_production_potential: 65, resources_in_europe: "yes", notes: "Two supply paths: (1) Austrian Rotax engines for long-range UAVs — Western-sourced. (2) Chinese-made piston engines — still used. Motor Sich cooperation with Baykar (AI-450 for Akıncı, AI-322F for MİUS-A, AI-25TLT for MİUS-B) exists but is export-oriented and not yet a significant factor in domestic supply. Manufacturers still lack domestic alternatives for larger models." },


];

const STATUS_CONFIG = {
  0: { color: "#ef4444", label: "China-only / Critical", bg: "#7f1d1d" },
  1: { color: "#f59e0b", label: "Partial (some EU)", bg: "#78350f" },
  2: { color: "#22c55e", label: "Produced in Europe/Ukraine", bg: "#14532d" },
};

const RESOURCES_COLOR = { yes: "#22c55e", partial: "#f59e0b", no: "#ef4444" };

function Bar({ value, color, bg = "#0a0f1a" }) {
  return (
    <div style={{ flex: 1, height: 5, background: bg, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2,
        transition: "width 0.4s ease" }} />
    </div>
  );
}

function MiniMetrics({ d, expanded = false }) {
  const resColor = RESOURCES_COLOR[d.resources_in_europe] || "#64748b";
  const hasNeeded = d.resources_needed && d.resources_needed.length > 0;
  return (
    <div style={{
      marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e3a5f",
      fontSize: 8, letterSpacing: 0.8
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: expanded ? "1fr 1fr" : "1fr",
        gap: expanded ? "6px 16px" : 4,
      }}>
        {/* Localization now */}
        <div>
          <div style={{ color: "#475569", marginBottom: 2 }}>UKRAINE PRODUCTION NOW</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bar value={d.ukraine_production_now} color="#60a5fa" />
            <span style={{ color: "#60a5fa", minWidth: 28 }}>{d.ukraine_production_now}%</span>
          </div>
        </div>
        {/* Potential */}
        <div>
          <div style={{ color: "#475569", marginBottom: 2 }}>UKRAINE PRODUCTION POTENTIAL</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Bar value={d.ukraine_production_potential} color="#818cf8" />
            <span style={{ color: "#818cf8", minWidth: 28 }}>{d.ukraine_production_potential}%</span>
          </div>
        </div>
        {/* Resources in Europe */}
        <div>
          <div style={{ color: "#475569", marginBottom: 2 }}>RESOURCES IN EUROPE</div>
          <span style={{
            color: resColor, padding: "1px 6px",
            border: `1px solid ${resColor}55`, background: `${resColor}11`
          }}>
            {d.resources_in_europe.toUpperCase()}
          </span>
        </div>
      </div>
      {/* Resources needed — only shown when partial/no */}
      {hasNeeded && (
        <div style={{ marginTop: 6 }}>
          <div style={{ color: "#ef444499", marginBottom: 4, letterSpacing: 1 }}>
            ⚠ MISSING RESOURCES / BLOCKERS:
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 12px", color: "#f87171", lineHeight: 1.8 }}>
            {d.resources_needed.map((r, i) => (
              <li key={i} style={{ color: "#fca5a5" }}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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

    // Compute depth for every node
    const depthMap = {};
    const computeDepth = (name, depth) => {
      depthMap[name] = depth;
      nodes.filter(n => n.are_part_of === name).forEach(child => computeDepth(child.name, depth + 1));
    };
    const rootNode = nodes.find(n => n.are_part_of === null);
    if (rootNode) computeDepth(rootNode.name, 0);
    nodes.forEach(n => { if (depthMap[n.name] === undefined) depthMap[n.name] = 3; });

    const depthRadius = depth => Math.max(9, 34 - depth * 6);
    const depthFont = depth => Math.max(5, 8.5 - depth * 1.1);
    const depthChars = depth => Math.max(7, 13 - depth);

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120).strength(0.6))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(d => depthRadius(depthMap[d.name] ?? 3) + 8));

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

    node.each(function(d) {
      const el = d3.select(this);
      const depth = depthMap[d.name] ?? 3;
      const r = depthRadius(depth);
      d._r = r;

      if (isRoot(d)) {
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
          .attr("stroke-width", Math.max(1, 2.5 - depth * 0.4));
      }

      // Glow ring on hover
      el.append("circle")
        .attr("class", "glow-ring")
        .attr("r", r + 5)
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

      const fontSize = depthFont(depth);
      const maxChars = depthChars(depth);
      const lineH = fontSize * 1.3;

      const words = d.name.split(/\s+/);
      const lines = [];
      let current = "";
      words.forEach(w => {
        if ((current + " " + w).trim().length > maxChars && current) {
          lines.push(current);
          current = w;
        } else {
          current = (current + " " + w).trim();
        }
      });
      if (current) lines.push(current);

      lines.forEach((line, i) => {
        label.append("tspan")
          .attr("x", 0)
          .attr("dy", i === 0 ? -(lines.length - 1) * lineH / 2 : lineH)
          .attr("font-size", fontSize)
          .attr("font-weight", depth <= 1 ? "bold" : "normal")
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
          {tooltip.data.ukraine_production_now !== undefined && (
            <MiniMetrics d={tooltip.data} />
          )}
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
          padding: "12px 20px", maxWidth: 560, width: "90%", zIndex: 999,
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
          {selectedNode.ukraine_production_now !== undefined && (
            <MiniMetrics d={selectedNode} expanded />
          )}
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
