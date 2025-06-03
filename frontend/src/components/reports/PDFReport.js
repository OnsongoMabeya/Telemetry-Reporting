import { jsPDF } from 'jspdf';
import axios from 'axios';
import BSILogo from '../../assets/images/bsilogo512.png';
import * as d3 from 'd3';
import './PDFReport.css';

const API_BASE_URL = 'http://localhost:5000';  // Hardcoding for now to fix the URL issue

const METRIC_KEYS = {
  'Forward Power': 'forwardPower',
  'Reflected Power': 'reflectedPower',
  'VSWR': 'vswr',
  'Return Loss': 'returnLoss',
  'Temperature': 'temperature',
  'Voltage': 'voltage',
  'Current': 'current',
  'Power': 'power'
};

const METRIC_UNITS = {
  'Forward Power': 'W',
  'Reflected Power': 'W',
  'VSWR': '',
  'Return Loss': 'dB',
  'Temperature': '°C',
  'Voltage': 'V',
  'Current': 'A',
  'Power': 'W'
};

// Modern theme colors
const THEME_COLORS = {
  primary: '#0A2647',      // Deep navy blue
  secondary: '#144272',    // Medium navy blue
  accent: '#205295',       // Bright navy blue
  highlight: '#2C74B3',    // Light navy blue
  warning: '#FF4B4B',      // Modern red for warnings
  success: '#4CAF50',      // Success green
  text: {
    primary: '#0A2647',    // Deep navy for primary text
    secondary: '#525252',   // Dark gray for secondary text
    light: '#FFFFFF'       // White text
  },
  background: {
    primary: '#FFFFFF',    // White
    secondary: '#F5F7F9',   // Light gray-blue
    accent: '#E8F0FE'      // Very light blue
  },
  border: '#E0E7FF'        // Light border color
};

const METRIC_COLORS = {
  'Forward Power': '#4361EE',    // Electric blue
  'Reflected Power': '#FF4B4B',  // Modern red
  'VSWR': '#3CCF4E',            // Fresh green
  'Return Loss': '#FFB700',      // Warm yellow
  'Temperature': '#9B5DE5',      // Modern purple
  'Voltage': '#00C4B4',         // Turquoise
  'Current': '#F72585',         // Hot pink
  'Power': '#4895EF'            // Sky blue
};

const getMetricInfo = (metric) => {
  const metricName = METRIC_KEYS[metric];
  const metricUnit = METRIC_UNITS[metric];
  const metricColor = METRIC_COLORS[metric];
  return { name: metricName, title: metric, unit: metricUnit, color: metricColor };
};

const formatDataPoints = (data, metricKey) => {
  if (!data || !Array.isArray(data)) {
    console.warn(`Invalid data format for ${metricKey}:`, data);
    return [];
  }

  return data.map(point => ({
    x: new Date(point.sample_time).getTime(),
    y: parseFloat(point[metricKey])
  })).filter(point => !isNaN(point.y));
};

const analyzeMetricData = (data, metric) => {
  if (!data || data.length === 0) {
    return {
      status: 'No Data',
      analysis: 'No data available for analysis.',
      recommendation: 'Please check data collection system.',
      stats: {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        trend: 'stable'
      }
    };
  }

  const values = data.map(point => point.y);
  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Calculate trend
  const recentValues = values.slice(-5); // Last 5 points
  const trend = recentValues.every((val, i) => i === 0 || val >= recentValues[i - 1]) ? 'increasing' :
                recentValues.every((val, i) => i === 0 || val <= recentValues[i - 1]) ? 'decreasing' : 'stable';

  let status = 'Normal';
  let analysis = '';
  let recommendation = '';

  // Calculate historical context
  const stdDev = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length);
  const variability = (stdDev / avg * 100).toFixed(1);
  const trendDescription = trend === 'increasing' ? 'rising' : trend === 'decreasing' ? 'falling' : 'stable';

  switch(metric.name) {
    case 'forwardPower':
      if (current < 0.8 * avg) {
        status = 'Warning';
        analysis = `Forward power shows significant degradation: Current output ${current.toFixed(2)}W is ${((1 - current/avg) * 100).toFixed(1)}% below average (${avg.toFixed(2)}W). Power trend is ${trendDescription} with ${variability}% variability over the monitoring period. Peak performance was ${max.toFixed(2)}W.`;
        recommendation = 'Immediate actions required:\n' +
                        '1. Inspect transmitter output stage\n' +
                        '2. Verify all RF connections and cable integrity\n' +
                        '3. Check power supply voltage stability\n' +
                        '4. Schedule maintenance if issues persist';
      } else {
        analysis = `Forward power performance is optimal: Current output ${current.toFixed(2)}W with ${variability}% variability. Power levels are ${trendDescription} and within expected range (${min.toFixed(2)}W - ${max.toFixed(2)}W). System showing good stability.`;
        recommendation = 'Maintenance recommendations:\n' +
                        '1. Continue regular monitoring\n' +
                        '2. Document stable performance period\n' +
                        '3. Schedule routine inspection within normal maintenance window';
      }
      break;

    case 'reflectedPower':
      const forwardRatio = current / (values.find(v => v > 0) || 1);
      const reflectedTrend = recentValues.reduce((acc, val, i) => i > 0 ? acc + (val - recentValues[i-1]) : 0, 0);
      
      if (forwardRatio > 0.2) {
        status = 'Warning';
        analysis = `Critical reflection levels detected: Current reflected power ${current.toFixed(2)}W represents ${(forwardRatio * 100).toFixed(1)}% of forward power. Showing ${trendDescription} pattern with ${variability}% variation. Historical range: ${min.toFixed(2)}W to ${max.toFixed(2)}W. ${reflectedTrend > 0 ? 'Reflected power is increasing, indicating worsening conditions.' : 'Condition appears stable but requires attention.'}`;
        recommendation = 'Urgent actions required:\n' +
                        '1. Perform full antenna system diagnostic\n' +
                        '2. Check all RF connections and terminations\n' +
                        '3. Verify antenna alignment and physical condition\n' +
                        '4. Consider reducing power until resolved\n' +
                        '5. Schedule immediate technical inspection';
      } else {
        analysis = `Reflected power within specifications: Current level ${current.toFixed(2)}W (${(forwardRatio * 100).toFixed(1)}% of forward power). Measurements show ${trendDescription} trend with ${variability}% variability. System maintaining good impedance match.`;
        recommendation = 'Preventive measures:\n' +
                        '1. Document current baseline performance\n' +
                        '2. Monitor for any trend changes\n' +
                        '3. Include in next routine maintenance check';
      }
      break;

    case 'vswr':
      const vswrChange = ((current - values[0]) / values[0] * 100).toFixed(1);
      if (current > 1.5) {
        status = 'Warning';
        analysis = `VSWR requires attention: Current ratio ${current.toFixed(2)}:1 exceeds optimal range. ${vswrChange}% change from initial reading. Showing ${trendDescription} pattern with peak value of ${max.toFixed(2)}:1. Variability of ${variability}% indicates ${variability > 5 ? 'potential system instability' : 'relatively stable conditions despite elevated levels'}.`;
        recommendation = 'Technical intervention required:\n' +
                        '1. Full RF system diagnostic scan\n' +
                        '2. Inspect all RF connections and grounds\n' +
                        '3. Check antenna physical condition and alignment\n' +
                        '4. Verify transmission line integrity\n' +
                        '5. Consider weather impact on readings';
      } else {
        analysis = `VSWR performance optimal: Current ratio ${current.toFixed(2)}:1 with ${variability}% variability. ${vswrChange}% change from initial reading. System maintaining excellent impedance match across ${trendDescription} trend. Range: ${min.toFixed(2)}:1 - ${max.toFixed(2)}:1.`;
        recommendation = 'Maintenance guidance:\n' +
                        '1. Record current performance metrics\n' +
                        '2. Monitor for any trend changes\n' +
                        '3. Update baseline measurements';
      }
      break;

    case 'temperature':
      const tempChange = ((current - values[0]) / values[0] * 100).toFixed(1);
      const tempRate = ((recentValues[recentValues.length-1] - recentValues[0]) / 5).toFixed(2); // °C per interval

      if (current > 40) {
        status = 'Warning';
        analysis = `Temperature requires monitoring: Current reading ${current.toFixed(2)}°C exceeds optimal range. ${tempChange}% change from initial reading, with ${tempRate}°C change per interval. Peak temperature was ${max.toFixed(2)}°C. System shows ${trendDescription} pattern with ${variability}% thermal variability. ${trend === 'increasing' ? 'Continued rise may impact system performance.' : 'Temperature stabilization needed for optimal operation.'}`;
        recommendation = 'Thermal management actions required:\n' +
                        '1. Verify all cooling fans operation\n' +
                        '2. Clean air filters and heat sinks\n' +
                        '3. Check ambient temperature conditions\n' +
                        '4. Inspect airflow obstructions\n' +
                        '5. Consider temporary power reduction';
      } else {
        analysis = `Temperature within specifications: Current reading ${current.toFixed(2)}°C with ${variability}% variability. Operating range ${min.toFixed(2)}°C - ${max.toFixed(2)}°C shows ${trendDescription} pattern. Thermal stability indicates proper cooling performance.`;
        recommendation = 'Preventive thermal measures:\n' +
                        '1. Document current thermal profile\n' +
                        '2. Schedule routine cooling system check\n' +
                        '3. Monitor seasonal temperature variations';
      }
      break;

    case 'voltage':
      const voltageVariation = Math.abs((current - avg) / avg * 100);
      const voltageRange = max - min;
      const nominalVoltage = 220; // Assuming 220V system
      const voltageDeviation = Math.abs((current - nominalVoltage) / nominalVoltage * 100).toFixed(1);

      if (voltageVariation > 10) {
        status = 'Warning';
        analysis = `Voltage stability concern: Current reading ${current.toFixed(2)}V shows ${voltageVariation.toFixed(1)}% variation from ${avg.toFixed(2)}V average. Range span is ${voltageRange.toFixed(2)}V with ${voltageDeviation}% deviation from nominal. System shows ${trendDescription} pattern with ${variability}% overall variability. Power quality may be affecting system performance.`;
        recommendation = 'Power stability measures required:\n' +
                        '1. Monitor main power source quality\n' +
                        '2. Check all power connections\n' +
                        '3. Verify UPS operation if installed\n' +
                        '4. Consider power conditioning equipment\n' +
                        '5. Log voltage events for analysis';
      } else {
        analysis = `Voltage performance optimal: Current level ${current.toFixed(2)}V with ${voltageVariation.toFixed(1)}% variation from average. Operating range ${min.toFixed(2)}V - ${max.toFixed(2)}V shows good stability. Power supply maintaining consistent output.`;
        recommendation = 'Power system maintenance:\n' +
                        '1. Document current power profile\n' +
                        '2. Schedule routine electrical inspection\n' +
                        '3. Monitor for any trend changes';
      }
      break;

    case 'current':
      const currentSpike = ((current - avg) / avg * 100).toFixed(1);
      const currentEfficiency = (current * values.find(v => metric.name === 'voltage') || 220) / 1000; // Power in kW
      const loadFactor = (avg / max * 100).toFixed(1);

      if (current > 1.2 * avg) {
        status = 'Warning';
        analysis = `Current consumption alert: Drawing ${current.toFixed(2)}A, ${currentSpike}% above average (${avg.toFixed(2)}A). Peak current was ${max.toFixed(2)}A with ${loadFactor}% load factor. System shows ${trendDescription} pattern with ${variability}% variability. Estimated power consumption at ${currentEfficiency.toFixed(2)}kW.`;
        recommendation = 'Electrical system actions needed:\n' +
                        '1. Check for abnormal loads\n' +
                        '2. Inspect all power connections\n' +
                        '3. Verify equipment operating states\n' +
                        '4. Monitor for thermal issues\n' +
                        '5. Consider load distribution analysis';
      } else {
        analysis = `Current draw within specifications: Operating at ${current.toFixed(2)}A with ${variability}% variability. Range ${min.toFixed(2)}A - ${max.toFixed(2)}A indicates normal load pattern. ${loadFactor}% load factor shows efficient system operation.`;
        recommendation = 'Power optimization steps:\n' +
                        '1. Document current consumption baseline\n' +
                        '2. Monitor for efficiency changes\n' +
                        '3. Plan regular load analysis';
      }
      break;

    default:
      if (Math.abs((current - avg) / avg * 100) > 20) {
        status = 'Warning';
        analysis = `Significant variation detected in ${metric.title}. Current: ${current.toFixed(2)}${metric.unit}, Avg: ${avg.toFixed(2)}${metric.unit}.`;
        recommendation = 'Investigate cause of variation and monitor system performance.';
      } else {
        analysis = `${metric.title} is within normal operating parameters.`;
        recommendation = 'Continue regular monitoring.';
      }
  }

  return {
    status,
    analysis,
    recommendation,
    stats: {
      current,
      min,
      max,
      avg,
      trend
    }
  };
};

const drawGraphOnCanvas = (ctx, data, metric, width, height) => {
  if (!data || data.length === 0) {
    console.warn(`No data points for ${metric}`);
    return;
  }

  // Calculate min/max values for scaling
  const values = data.map(point => point.y);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valuePadding = (maxValue - minValue) * 0.1;

  // Calculate time range
  const timestamps = data.map(point => point.x);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  // Set up scaling functions
  const scaleX = d3.scaleTime()
    .domain([new Date(minTime), new Date(maxTime)])
    .range([50, width - 20]);

  const scaleY = d3.scaleLinear()
    .domain([minValue - valuePadding, maxValue + valuePadding])
    .range([height - 30, 20]);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw axes
  ctx.beginPath();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;

  // Y-axis
  ctx.moveTo(50, 20);
  ctx.lineTo(50, height - 30);

  // X-axis
  ctx.moveTo(50, height - 30);
  ctx.lineTo(width - 20, height - 30);
  ctx.stroke();

  // Draw data points and lines
  ctx.beginPath();
  ctx.strokeStyle = metric.color || '#2196f3';
  ctx.lineWidth = 2;

  data.forEach((point, i) => {
    const x = scaleX(new Date(point.x));
    const y = scaleY(point.y);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Add labels
  ctx.fillStyle = '#000';
  ctx.font = '12px Arial';

  // Y-axis labels
  const yTicks = scaleY.ticks(5);
  yTicks.forEach(tick => {
    const y = scaleY(tick);
    ctx.fillText(`${tick.toFixed(1)}${metric.unit}`, 5, y + 4);
  });

  // X-axis labels
  const xTicks = scaleX.ticks(5);
  xTicks.forEach(tick => {
    const x = scaleX(tick);
    ctx.fillText(tick.toLocaleTimeString(), x - 20, height - 5);
  });
};

const PDFReport = {
  async generateReport(telemetryData, nodeName, baseStation, pdf = new jsPDF()) {
    // Load logo once for reuse
    const logoImg = new Image();
    logoImg.src = BSILogo;
    await new Promise((resolve) => {
      logoImg.onload = () => {
        try {
          resolve();
        } catch (error) {
          console.error('Error loading logo:', error);
          resolve();
        }
      };
      logoImg.onerror = () => {
        console.error('Error loading logo');
        resolve();
      };
    });

    // Helper function to add header and footer
    const addHeaderFooter = (pageNum, totalPages) => {
      // Header with small logo
      const headerLogoSize = 12;
      pdf.addImage(logoImg, 'PNG', marginX, marginY/2, headerLogoSize, headerLogoSize/2);
      
      // Footer with small logo and page number
      const footerY = pageHeight - marginY/2;
      pdf.addImage(logoImg, 'PNG', marginX, footerY - headerLogoSize/2, headerLogoSize, headerLogoSize/2);
      pdf.setFontSize(FONTS.caption);
      pdf.setTextColor(THEME_COLORS.text.primary);
      pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' });
    };
    // Set consistent margins and spacing
    const marginX = 20; // Increased margins for better readability
    const marginY = 25; // Increased for header/footer space
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const contentWidth = pageWidth - (2 * marginX);
    
    // Font sizes for different content types
    const FONTS = {
      title: 16,
      subtitle: 12,
      heading: 14,
      subheading: 11,
      body: 10,
      caption: 8
    };

    // Line heights for different content types
    const LINE_HEIGHTS = {
      title: 1.5,
      normal: 1.3,
      compact: 1.2
    };
    
    // Use consistent dark text color
    const textColor = THEME_COLORS.text.primary;
    
    // Helper function to wrap text and return height
    const wrapText = (text, fontSize) => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(text, contentWidth - 15);
    };
    
    // Helper function to add wrapped text and return new Y position
    const addWrappedText = (text, x, y, fontSize, fontStyle = 'normal', lineHeightFactor = LINE_HEIGHTS.normal) => {
      pdf.setFont('helvetica', fontStyle);
      pdf.setFontSize(fontSize);
      const lines = wrapText(text, fontSize);
      const lineHeight = fontSize * lineHeightFactor / 72 * 25.4;
      lines.forEach((line, i) => {
        pdf.text(line, x, y + (i * lineHeight));
      });
      return y + (lines.length * lineHeight);
    };

    // Helper function to add section with background
    const addSection = (y, height, color) => {
      pdf.setFillColor(color);
      pdf.roundedRect(marginX, y - 5, contentWidth, height, 3, 3, 'F');
      return y;
    };
    let currentY = marginY;
    
    // Initialize first page header/footer
    addHeaderFooter(1, 1);

    // Add header text
    pdf.setTextColor(textColor);
    currentY = addWrappedText('Telemetry Report', pageWidth - marginX - 80, currentY + 5, FONTS.title, 'bold', LINE_HEIGHTS.title);
    
    // Add subheader info
    const headerText = `${nodeName} | ${baseStation}`;
    currentY = addWrappedText(headerText, pageWidth - marginX - 80, currentY, FONTS.subtitle, 'normal');
    
    // Add timestamp
    currentY = addWrappedText(`Generated: ${new Date().toLocaleString()}`, pageWidth - marginX - 80, currentY, FONTS.caption, 'normal');
    
    currentY += 15; // Add space after header

    // Reset text color
    pdf.setTextColor(THEME_COLORS.text.primary);
    
    // Create canvas for graphs
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 150; // Further reduced height for more compact graphs
    const ctx = canvas.getContext('2d');

    // Process each metric
    for (const metric of Object.keys(METRIC_KEYS)) {
      const metricInfo = getMetricInfo(metric);
      const formattedData = formatDataPoints(telemetryData, metricInfo.name);

      if (formattedData.length > 0) {
        // Draw graph on canvas
        drawGraphOnCanvas(ctx, formattedData, metricInfo, canvas.width, canvas.height);

        // Get analysis data
        const analysis = analyzeMetricData(formattedData, metricInfo);
        if (!analysis) continue;

        // Check if we need a new page
        if (currentY + 90 > pageHeight - marginY) {
          pdf.addPage();
          currentY = marginY + 10;
          addHeaderFooter(pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
        }

        // Add graph to PDF
        const imgData = canvas.toDataURL('image/png');
        
        // Add compact metric section with proper margins
        pdf.setFillColor(THEME_COLORS.background.secondary);
        pdf.rect(marginX, currentY - 5, contentWidth, 80, 'F'); // Use contentWidth for consistent margins

        // Add metric section
        const metricSectionY = currentY;
        const metricHeight = 30;
        addSection(metricSectionY, metricHeight, THEME_COLORS.background.secondary);

        // Add metric title with status indicator
        pdf.setFillColor(metricInfo.color);
        pdf.circle(marginX + 5, currentY + 10, 4, 'F');
        
        // Add metric name and current value
        pdf.setTextColor(THEME_COLORS.text.primary);
        currentY = addWrappedText(metric, marginX + 15, currentY + 7, FONTS.heading, 'bold');
        
        // Add current value and status
        pdf.setTextColor(THEME_COLORS.text.secondary);
        const statusText = `Current: ${analysis.stats.current.toFixed(2)}${metricInfo.unit} | Status: ${analysis.status}`;
        currentY = addWrappedText(statusText, marginX + 15, currentY, FONTS.subheading, 'normal');
        
        currentY += 10;

        // Add graph with proper sizing
        const graphWidth = contentWidth - 30;
        const graphHeight = 100;
        pdf.addImage(imgData, 'PNG', marginX + 15, currentY, graphWidth, graphHeight);
        currentY += graphHeight + 15;

        // Add analysis section with proper spacing
        if (currentY + 100 > pageHeight - marginY) {
          pdf.addPage();
          currentY = marginY + 10;
          addHeaderFooter(pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
        }

        // Analysis section background
        const analysisSectionY = currentY;
        addSection(analysisSectionY, 60, THEME_COLORS.background.primary);

        // Add Analysis heading
        pdf.setTextColor(THEME_COLORS.text.primary);
        currentY = addWrappedText('Analysis', marginX + 10, currentY + 7, FONTS.subheading, 'bold');

        // Add analysis content
        pdf.setTextColor(THEME_COLORS.text.secondary);
        currentY = addWrappedText(analysis.analysis, marginX + 10, currentY + 5, FONTS.body, 'normal');
        
        currentY += 15;

        // Check for page break before recommendations
        if (currentY + 80 > pageHeight - marginY) {
          pdf.addPage();
          currentY = marginY + 10;
          addHeaderFooter(pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
        }

        // Recommendations section
        const recommendationSectionY = currentY;
        addSection(recommendationSectionY, 70, THEME_COLORS.background.accent);

        // Add Recommendations heading
        pdf.setTextColor(textColor);
        currentY = addWrappedText('Recommendations', marginX + 10, currentY + 7, FONTS.subheading, 'bold');

        // Add recommendations content with bullet points
        pdf.setTextColor(textColor);
        const recommendations = analysis.recommendation.split('\n');
        // Store currentY in a local variable to avoid closure issues
        let sectionY = currentY;
        recommendations.forEach((rec) => {
          if (rec.trim()) {
            sectionY = addWrappedText(`• ${rec.trim()}`, marginX + 15, sectionY + 5, FONTS.body, 'normal');
          }
        });
        currentY = sectionY;

        currentY += 20;
        
        // Add header and footer to current page
        addHeaderFooter(pdf.internal.getNumberOfPages(), pdf.internal.getNumberOfPages());
      }
    }

    return pdf;
  },

  async fetchData(nodeName, baseStation, timeFilter) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/telemetry/${nodeName}/${baseStation}?timeFilter=${timeFilter}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching telemetry data:', error);
      return [];
    }
  }
};

export const generatePDFReport = async (config, baseStations = []) => {
  try {
    if (!baseStations || baseStations.length === 0) {
      throw new Error('No base stations available for this node');
    }

    // Fetch telemetry data for each base station
    const allTelemetryData = {};
    for (const baseStation of baseStations) {
      if (!baseStation || !baseStation.name) {
        console.warn('Invalid base station:', baseStation);
        continue;
      }
      console.log(`Fetching data for base station: ${baseStation.name}`);
      const telemetryData = await PDFReport.fetchData(config.node, baseStation.name, config.timeRange);
      console.log(`Received data for ${baseStation.name}:`, {
        dataLength: telemetryData.length,
        sampleData: telemetryData.slice(0, 2)
      });
      allTelemetryData[baseStation.name] = telemetryData;
    }

    // Generate PDF for each base station
    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const baseStation of baseStations) {
      const telemetryData = allTelemetryData[baseStation.name];
      if (!telemetryData || telemetryData.length === 0) continue;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      await PDFReport.generateReport(telemetryData, config.node, baseStation.name, pdf);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    pdf.save(`${config.node}_telemetry_report_${timestamp}.pdf`);

    return {
      success: true,
      message: 'PDF report generated successfully'
    };
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return {
      success: false,
      message: error.message || 'Error generating PDF report'
    };
  }
};

export default PDFReport;
