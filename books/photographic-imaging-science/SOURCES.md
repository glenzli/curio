# 资料源

正文全部采用本书自己的推导和表述。标准、白皮书和厂商技术页用于固定术语、公式
版本和具体实现；产品宣传不作为一般物理规律的证据。

## 成像物理与传感器

- John Tsitsiklis and Patrick Jaillet, MIT *Introduction to Probability*, Spring 2018,
  [Lecture 22: The Poisson Process](https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/d92a00a2bc9d20d84ad11d43be0e7ae0_MITRES_6_012S18_L22.pdf)
  and [Lecture 23: More on the Poisson Process](https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/5dc3b904bffcf92b4e5ec6c67d603414_MITRES_6_012S18_L23.pdf),
  topics “Distribution of interarrival times” and “Merging and splitting”. Chapter 2
  derives thinning and conditional variance in the text; the simulation samples
  independent exponential waiting times and Bernoulli marks rather than Gaussian counts.
- Stuart Kleinfelder, SukHwan Lim, Xinqiao Liu and Abbas El Gamal,
  [A 10k FPS 0.18 µm CMOS Digital Pixel Sensor with Pixel-Level Memory](https://isl.stanford.edu/~abbas/group/papers_and_pub/isscc2001slides.pdf),
  ISSCC 2001 slides, slide 7, “Single Slope ADC Operation”. The source fixes the ramp,
  comparator and latch mechanism. It describes pixel-level ADCs with Gray counters;
  Chapter 3's shared-column drawing and binary counter are an ideal teaching model,
  not a reproduction of that architecture or its measured performance.

- James R. Janesick, *Photon Transfer*, SPIE Press, 2007.
- James R. Janesick, *Scientific Charge-Coupled Devices*, SPIE Press, 2001.
- Gerald C. Holst and Terrence S. Lomheim, *CMOS/CCD Sensors and Camera
  Systems*, 2nd ed., JCD Publishing/SPIE Press, 2011.
- Eric R. Fossum, “CMOS Image Sensors: Electronic Camera-on-a-Chip,”
  *IEEE Transactions on Electron Devices* 44(10), 1997, pp. 1689--1698.
- Eric R. Fossum and Donald B. Hondongwa, [“A Review of the Pinned Photodiode
  for CCD and CMOS Image Sensors”](https://digitalcommons.dartmouth.edu/facoa/2423/),
  *IEEE Journal of the Electron Devices Society* 2(3), 2014, pp. 33--43,
  DOI 10.1109/JEDS.2014.2306412. Background for the functional 4T/PPD sequence;
  the interactive readout model is an idealized calculation, not a circuit simulation.
- Albert J. P. Theuwissen, *Solid-State Imaging with Charge-Coupled Devices*,
  Kluwer, 1995.
- European Machine Vision Association, [EMVA Standard 1288, Release 4.0 Linear](https://www.emva.org/wp-content/uploads/EMVA1288Linear_4.0Release.pdf),
  16 June 2021, §§2.1, 2.4--2.5 and 3.1, especially the photon transfer
  relation, Eq. (15), and dark-current variance, Eq. (30). The official PDF was
  read on 17 October 2026. Chapter 4 uses this linear model. The separate
  [Release 4.0 General](https://www.emva.org/wp-content/uploads/EMVA1288General_4.0Release.pdf)
  addresses broader camera responses; it must not be cited as if it were the same derivation.
  The paired-flat-field interactive also uses §2.5, Eqs. (16)--(18), for mean
  subtraction and half the difference variance. It uses the N−1 sample denominator
  for its small ROI and declares its own simulation and fit-selection conditions.
  The correlation/calibration tab is a separate Gaussian random-effects teaching
  model. Its per-frame row/column noise, two-way variance estimates and shared-dark
  covariance are derived in Chapter 4; they are not presented as the standard's
  fixed spatial-nonuniformity measurement or a conformity implementation.
- Hamamatsu Photonics, [Photon Number Resolving Camera Technology](https://camera.hamamatsu.com/content/dam/hamamatsu-photonics/sites/documents/99_SALES_LIBRARY/sys/SCAS0149E_qCMOS_whitepaper.pdf),
  sections on BSI, DTI, QE, noise and MTF.
- Sony Semiconductor Solutions, [Pregius/Pregius S Global Shutter Technology](https://www.sony-semicon.com/en/technology/industry/pregius.html).
- Sony Corporation, [Next-generation Back-Illuminated CMOS Image Sensor](https://www.sony.com/en/SonyInfo/News/Press/201201/12-009E/),
  23 January 2012, “About stacked CMOS image sensors”; and Sony Semiconductor
  Solutions, [Pregius S development interview](https://www.sony-semicon.com/en/feature/2021020201.html),
  2 February 2021, “Schematic cross section of chip”. Checked 18 October 2026.
  These fix the depicted light-entry side, front-side wiring and separate pixel/
  logic chip relation in Chapter 6. The animated cross sections are functional
  teaching drawings, not process masks, measured optical paths or performance models.
- Brian Guenter et al., [“Highly curved image sensors: a practical approach for
  improved optical performance”](https://www.microsoft.com/en-us/research/publication/highly-curved-image-sensors-practical-approach-improved-optical-performance/),
  *Optics Express* 25(12), 2017, pp. 13010--13023.

## 曝光、ISO 与计算成像

- ISO, [ISO 12232:2019, Photography -- Digital still cameras -- Determination
  of exposure index, ISO speed ratings, standard output sensitivity, and
  recommended exposure index](https://www.iso.org/standard/73758.html), edition 3,
  together with [Amendment 1:2020, determination of encoding-relative sensitivity
  (ERS)](https://www.iso.org/standard/79168.html). The base standard was confirmed
  in 2024 and remained published when checked on 17 October 2026. This check
  covers the public catalogue and scope, not the purchased conformity text.
- Samuel W. Hasinoff et al., [“Burst photography for high dynamic range and
  low-light imaging on mobile cameras”](https://research.google/pubs/burst-photography-for-high-dynamic-range-and-low-light-imaging-on-mobile-cameras/),
  *ACM Transactions on Graphics* 35(6), 2016.
  The book's horizontal gradient-correlation example is a separate teaching algorithm;
  it does not reproduce this paper's constant-exposure FFT alignment and burst pipeline.
  The added two-dimensional example directly searches normalized intensity correlation
  on a fixed common support, with bilinear observation sampling. Equation (8.2b),
  sign conventions, failure cases and known-shift comparisons are derived and checked
  in this book; it is not an implementation of the paper's alignment method.
- Paul E. Debevec and Jitendra Malik, [“Recovering High Dynamic Range Radiance
  Maps from Photographs”](https://people.eecs.berkeley.edu/~malik/papers/debevec-malik97.pdf),
  SIGGRAPH 1997.
- Sony Semiconductor Solutions, [Hybrid Frame-HDR](https://www.sony-semicon.com/en/technology/mobile/hf-hdr.html),
  for a concrete combination of conversion-gain and multi-frame HDR.
- Canon, [Dual Gain Output Sensor White Paper](https://downloads.canon.com/cinemaeos/DGO-Sensor-White-Paper.pdf),
  2020, printed pp. 3–5, especially Figure 4 and “Implementation of the Dual Gain
  Settings on Each Photodiode Output”, as a concrete sequential dual-readout
  implementation. Chapter 5 derives its own shared-charge covariance and fusion
  equations; its Gaussian noise levels, voltage limits and clipping selector are
  declared teaching assumptions, not measured Canon parameters.

## Log、RAW 与色彩编码

- Bryce E. Bayer, [“Color imaging array”, US3971065A](https://patents.google.com/patent/US3971065A/en),
  published 20 July 1976, preferred interleaved green/red/blue layout.
  Chapter 7 derives its RGGB sampling cosets, reciprocal-lattice frequency cells
  and phase corrections directly; the neutral-sinusoid and bilinear examples
  do not reproduce a proprietary demosaicing pipeline.
- ARRI, [ARRI LogC4 Logarithmic Color Space Specification](https://www.arri.com/resource/blob/278790/db65b86066de1f74852edb8f15acf082/2023-05-arri-logc4-specification-data.pdf),
  May 2023, §3.1 hardware EI gain and §4.1 EI-independent decoding curve.
- ARRI, [Dynamic Range White Paper](https://www.arri.com/resource/blob/295460/e10ff8a5b3abf26c33f8754379b57442/2022-09-28-arri-dynamic-range-whitepaper-data.pdf),
  28 September 2022, Table 4 and the Log C encoding section;
  includes the ALEXA 35 high-EI encoding limit described in that implementation.
- Sony, [Help Guide for Creators: Base ISO](https://helpguide.sony.net/di/pp/v1/en/contents/TP1000756719.html)
  and [Gamut](https://helpguide.sony.net/di/pp/v1/en/contents/TP1000756714.html).
- Adobe, [Digital Negative (DNG) Specification 1.7.1.0](https://helpx.adobe.com/content/dam/help/en/camera-raw/digital-negative/jcr_content/root/content/flex/items/position/position-par/download_section_733958301/download-1/DNG_Spec_1_7_1_0.pdf),
  September 2023; [official download page](https://helpx.adobe.com/camera-raw/desktop/dng-and-file-formats/digital-negative.html).
  The official PDF was read on 17 October 2026: ColorMatrix1/2, p. 33;
  ForwardMatrix1/2, pp. 52--53; raw linearization and normalization, Chapter 5,
  p. 99; colour processing, Chapter 6, pp. 100 onward. ColorMatrix maps XYZ to
  reference camera coordinates; ForwardMatrix maps white-balanced camera colours to D50 XYZ.
  Rechecked 18 October 2026 for the generated 32×32 teaching DNG: Chapters 3–5
  (uncompressed TIFF storage, CFA, version, black/white and normalization tags).
  Its virtual identity ColorMatrix is not a measured camera profile. LibRaw also
  independently decodes every stored sample; no SDK code or external image is redistributed.
- Yuteng Zhu and Graham D. Finlayson, [“Designing a Color Filter via Optimization
  of Vora-Value for Making a Camera more Colorimetric”](https://arxiv.org/abs/2005.06421),
  2020 preprint, introduction and §2, for the Luther condition and spectral
  sensitivity subspaces. Chapter 7 gives its own integral-form matrix criterion and proof.
  Its four-band metamerism example declares ideal box responses rather than borrowing
  measured sensitivities or CIE functions. Null-space construction, changed illuminant
  and response comparisons, and quadrature checks belong to this teaching model.
- ITU-R, [Recommendation BT.2100](https://www.itu.int/rec/R-REC-BT.2100/en),
  for the distinction between PQ and HLG in HDR television; Chapter 9 uses only
  their roles, not a complete HDR mastering specification.
- Apple, [Apple ProRes RAW White Paper](https://www.apple.com/final-cut-pro/docs/Apple_ProRes_RAW.pdf).
- Charles Poynton, *Digital Video and HD: Algorithms and Interfaces*, 2nd ed.,
  Morgan Kaufmann, 2012.
- R. W. G. Hunt and M. R. Pointer, *Measuring Colour*, 4th ed., Wiley, 2011.

## 几何光学、Fourier 光学与镜头

- Max Born and Emil Wolf, *Principles of Optics*, 7th expanded ed., Cambridge
  University Press, 1999.
- Joseph W. Goodman, *Introduction to Fourier Optics*, 4th ed., W. H. Freeman,
  2017.
- MIT, [2.71/2.710 Optics, Lecture 25 review notes](https://live.ocw.mit.edu/courses/2-71-optics-spring-2014/ecd8b4c1c7717a31e961837de299879b_MIT2_71S14_lec25_notes.pdf),
  Nick Fang, 12 May 2014, §§C–E (pp. 5–8): negative-sign Fourier convention,
  Fraunhofer propagation, coherent amplitude and incoherent intensity transfer.
  Chapters 12–13 use this scalar framework; the disk normalization, four explicitly
  defined wavefront modes, defocus sinc-squared reference and finite-grid checks
  are worked out for this book. The staged display is a calculation sequence,
  not propagation time or a prescription-based lens simulation.
- Warren J. Smith, *Modern Optical Engineering*, 4th ed., McGraw-Hill, 2008.
- Rudolf Kingslake and R. Barry Johnson, *Lens Design Fundamentals*, 2nd ed.,
  Academic Press, 2010.
- MIT, [6.161 Geometric Optics notes](https://web.mit.edu/6.161/www/Geometric-Optics-9-07.pdf),
  §§2.2--2.2.2: cascaded ray-transfer matrices, the B = 0 imaging condition and
  two-lens systems. Chapters 11 and 16 use height followed by reduced angle;
  the interactive independently traces thin-group angle kicks and translations in air.
- Zichao Fan et al., [Paraxial design of four-component zoom lens system with fixed
  distance between focal points by matrix optics](https://arxiv.org/abs/2102.09319),
  revised 2022. Background for constraining zoom trajectories by matrix elements;
  Chapter 16 derives a separate three-thin-group example and does not reproduce
  this paper's four-component design or aberration optimization.
- Nikon, [Image Stabilization: Technology Overview](https://www.nikon.com/company/technology/technology_fields/software_and_systems/image_stabilization/),
  for lens-shift and sensor-shift mechanisms and coordination. The interactive
  derives its own affine thin-group and delayed-sinusoid model; it uses no
  manufacturer controller parameters or claimed stabilization-stop figures.
- Ansys, [OpticStudio User Guide: Back Focal Length](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v251/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Back_Focal_Length.html),
  for the last optical surface reference used for back focal length in Chapter 11.
- Edmund Optics, [Telecentric Design Topics](https://www.edmundoptics.co.uk/knowledge-center/application-notes/imaging/telecentric-design-topics/),
  for entrance and exit pupils as images of the aperture stop in Chapter 11,
  and the distinction between object-space, image-space and double telecentricity
  in Chapter 16. The two-lens interactive derives its own pupil conjugates and
  separates chief-ray scale from defocus; it uses no product accuracy claims.
- Virendra N. Mahajan, *Optical Imaging and Aberrations*, SPIE Press.
- Virendra N. Mahajan, [“Strehl ratio for primary aberrations: some analytical results
  for circular and annular pupils”](https://opg.optica.org/josa/abstract.cfm?uri=josa-72-9-1258),
  JOSA 72, 1258–1266 (1982), abstract and Table 1: small-aberration approximation
  and its reference-point/balancing conventions. Chapter 13 derives the on-axis
  second-order expansion and does not infer an exact peak search from RMS alone.
- Virendra N. Mahajan, [“Line of sight of an aberrated optical system”](https://opg.optica.org/josaa/abstract.cfm?uri=josaa-2-6-833),
  JOSA A 2, 833–846 (1985), abstract and Table 1: peak, centroid and reference-origin
  irradiance are distinct for coma. Chapter 13 explicitly separates a fixed-plane
  peak-ratio convention from its fixed-origin readout S₀. Article tables/abstracts
  were checked; no claim is made to have accessed the paywalled full texts.
- Ansys, [OpticStudio 2025 R2 User Guide: Seidel Coefficients](https://ansyshelp.ansys.com/public/Views/Secured/Zemax/v252/en/OpticStudio_User_Guide/OpticStudio_Help/topics/Seidel_Coefficients.html),
  for the distinction and conversion between third-order ray and fourth-order
  wavefront aberration coefficients used in Chapter 13.
- Nikon, [NIKKOR Lens Glossary: Multi-focusing system](https://imaging.nikon.com/imaging/lineup/lens/glossary/),
  and Kouichi Ohshita, [NIKKOR Thousand and One Nights No. 84](https://imaging.nikon.com/imaging/information/story/0084/index.html),
  especially the close-range-correction discussion. Background for multiple
  independently moving groups and close-range aberration correction. Chapter 16
  derives a separate paraxial focus/angular-scale example; it does not reproduce
  the optical prescription or the reported lens rendering.
- Edmund Optics, [Depth of Field and Depth of Focus](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/depth-of-field-and-depth-of-focus/).
  Background for geometric ray-cone acceptance versus resolution and diffraction.
  Chapter 16 derives its own thin-lens near/far/hyperfocal formulas and checks
  them using independent edge-ray roots; no product depth specification is used.
- H. Angus Macleod, *Thin-Film Optical Filters*, 4th ed., CRC Press, 2010.
- Steven J. Byrnes, [Multilayer optical calculations, arXiv:1603.02720v5](https://arxiv.org/abs/1603.02720v5),
  2020-12-30, §§2--4 and Appendix A: Snell angles, s/p Fresnel fields, coherent layers,
  Poynting normalization and the sign of reflected p amplitudes. Chapter 15 compares
  characteristic matrices for tangential E with a separate full-vector Fresnel recursion,
  at normal and oblique incidence. The book uses real constant indices, propagating waves
  and a semi-infinite substrate; TIR, absorption and evanescent layers are excluded.
  Its +i matrix follows exp(+iωt), conjugating the phase convention in the paper;
  p amplitudes are converted to the same tangential-field basis before comparison.
- I. A. Erteza, [Diffraction efficiency analysis for multi-level diffractive optical
  elements](https://digital.library.unt.edu/ark:/67531/metadc620317/m1/8/),
  Sandia report, November 1995, §2.1.2, p. 4: diffraction-order efficiencies from
  Fourier coefficients of a stepped phase grating. Chapter 15 derives its own
  constant-index, scalar local-grating model and compares exact interval integrals
  with midpoint quadrature; it does not model a manufactured radial PF lens.
- SCHOTT, optical glass data sheets for
  [N-BK7](https://media.schott.com/api/public/content/41e799d0bf874807a0bb8e702fbb75b5?v=54856406)
  and [N-F2](https://media.schott.com/api/public/content/061f3156c83a44ed9220770b0f65a869?v=d69b35e0),
  especially the Sellmeier constants, reference-line indices and relative partial
  dispersion. Chapter 14 stores the numerical coefficients locally, uses wavelengths
  in µm in the formula, and limits the demonstration to 435.83--700 nm. The catalog
  values are material inputs; the chosen lens powers do not reproduce a manufactured lens.
- Carl Zeiss Camera Lens Division, [How to Read MTF Curves](https://lenspire.zeiss.com/photo/app/uploads/2018/04/Article-MTF-2008-EN.pdf).
- ISO, [ISO 12233:2024, Digital cameras -- Resolution and spatial frequency
  responses](https://www.iso.org/standard/88626.html), edition 5.
- Peter D. Burns, [“Slanted-Edge MTF for Digital Camera and Scanner Analysis”](https://www.imaging.org/common/uploaded%20files/pdfs/Papers/2000/PICS-0-81/1621.pdf),
  IS&T PICS 2000, pp. 135--138, especially the discrete derivative and noise-bias
  sections. Used for the error analysis in Chapter 17, not as a substitute for
  the complete 2024 ISO test requirements.
  The edge-fitting interactive follows the derivative-centroid and linear-fit outline
  on pp. 135--136, with locally declared smoothing, support and rejection thresholds.
- Nikon, [Aberration Correction](https://www.nikon.com/company/technology/technology_fields/optics/aberration_correction/)
  and [Resin for Phase Fresnel Lenses](https://www.nikon.com/company/technology/technology_fields/materials/phase_fresnel_lens/).
- Nikon Research Report Vol. 4 (2022), [chromatic-aberration correction with
  glass maps and partial dispersion](https://www.nikon.com/company/technology/nrr/pdf/nrr_vol4_2022_04_e.pdf).
- Canon, [Interchangeable Lens Technologies](https://global.canon/en/technology/canon-tech/tech/iclenses/)
  and [Fluorite Lenses](https://global.canon/en/c-museum/special/exhibition2.html).
- 日本 Zeon, [Cyclo Olefin Polymer optical resin resources](https://www.zeon.co.jp/business/enterprise/resin/cop/).

## 标准边界

ISO 12232:2019/Amd 1:2020、ISO 12233:2024、CIE 色度学标准和若干编码标准的完整
规范受版权或获取条件约束。本书只重述主线所需定义和可公开核验部分，不复制标准
文本。标准中的合格性测试、容差和设备认证不属于本书内部闭包。

## 本轮展示的补充来源

- Analog Devices, [MT-010: The Importance of Data Converter Static Specifications](https://www.analog.com/media/en/training-seminars/tutorials/mt-010.pdf),
  pp. 4–7, Figures 5–8: INL reference-line choices and DNL code widths. Chapter 3
  declares its own monotone quadratic ramp, fixed-endpoint threshold reference and
  column offsets, then derives exact code-width and threshold errors. No measured ADC
  performance or missing-code behavior is inferred from that example.
- ARRI, [ALEXA 35 SUP 1.1 User Manual](https://www.arri.com/resource/blob/282238/84d1df5e5269a799515446d37d10876a/user-manual-alexa-35-sup-1-0-data.pdf),
  §9.4, p. 39: EI, exposure normalization and middle-gray placement. Together with
  the May 2023 LogC4 specification §§3.1 and 4.1, this fixes the distinction between
  hardware gain and scene-linear decoding. Chapters 5/9 use a separate fixed-sensor,
  teaching-Log and hard-white Gamma chain; it is not an ARRI LUT or hardware reproduction.
- Irvine C. Gardner, [Validity of the Cosine-Fourth-Power Law of Illumination](https://nvlpubs.nist.gov/nistpubs/jres/39/jresv39n3p213_A1b.pdf),
  *Journal of Research of the National Bureau of Standards* 39 (1947), pp. 213–219,
  RP1824, especially §§II, IV.1 and Table 1. Finite uniform-pupil illumination and the
  limits imposed by pupil distortion and angle definitions. Chapter 1 derives its own
  disk and boundary integrals; the numerical test also checks the table's correction
  1.076 at 40° with sinα=0.25. The demonstration is not a real-lens vignetting prediction.
- MIT 2.71/2.710, [Lecture 6: Aperture stop, entrance and exit pupils](https://ocw.mit.edu/courses/2-71-optics-spring-2009/4579ef815b0fa56546a2c3861ff1a76b_MIT2_71S09_lec06.pdf), 2009-02-23, slides 3–6：光阑、两侧瞳像与主/边缘光线。第11章使用定义并自行推导两薄组共轭式、实际孔径约束和入口圆盘交集；互动光路由本书模型生成，未复制讲义图。
- Ansys Optics, [How to model colored and Tristimulus Sources](https://optics.ansys.com/hc/en-us/articles/43071101853331-How-to-model-colored-and-Tristimulus-Sources), “Source modeling using measured spectra”：多谱线和权重的输入约定。第12章的探测信号权重、同一像面上的 PSF/OTF 合成和位移相位由书内式 (12.9a)–(12.9b) 推出；不复现商业软件的追迹算法。
