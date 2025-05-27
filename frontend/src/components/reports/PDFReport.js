import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import * as d3 from 'd3';
import './PDFReport.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

const METRIC_COLORS = {
  'Forward Power': '#2196f3',
  'Reflected Power': '#f44336',
  'VSWR': '#4caf50',
  'Return Loss': '#ff9800',
  'Temperature': '#9c27b0',
  'Voltage': '#795548',
  'Current': '#607d8b',
  'Power': '#009688'
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
    ctx.fillText(tick.toLocaleTimeString(), x - 20, height - 10);
  });
};

const PDFReport = {
  async generateReport(telemetryData, nodeName, baseStation, pdf = new jsPDF()) {
    let currentY = 20;
    
    // Add header
    pdf.setFontSize(16);
    pdf.text(`Telemetry Report - ${nodeName}`, 105, currentY, { align: 'center' });
    currentY += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Base Station: ${baseStation}`, 105, currentY, { align: 'center' });
    currentY += 10;
    
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, currentY, { align: 'center' });
    currentY += 20;

    // Create canvas for graphs
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    // Process each metric
    for (const metric of Object.keys(METRIC_KEYS)) {
      const metricInfo = getMetricInfo(metric);
      const formattedData = formatDataPoints(telemetryData, metricInfo.name);

      if (formattedData.length > 0) {
        // Draw graph on canvas
        drawGraphOnCanvas(ctx, formattedData, metricInfo, canvas.width, canvas.height);

        // Add graph to PDF
        const imgData = canvas.toDataURL('image/png');
        if (currentY + 200 > pdf.internal.pageSize.height) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.text(metric, 105, currentY, { align: 'center' });
        currentY += 10;
        pdf.addImage(imgData, 'PNG', 10, currentY, 190, 95);
        currentY += 100;

        // Add statistics
        const values = formattedData.map(point => point.y);
        const stats = {
          current: values[values.length - 1].toFixed(2),
          min: Math.min(...values).toFixed(2),
          max: Math.max(...values).toFixed(2),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
        };

        pdf.setFontSize(10);
        pdf.text(`Current: ${stats.current}${metricInfo.unit} | Min: ${stats.min}${metricInfo.unit} | Max: ${stats.max}${metricInfo.unit} | Avg: ${stats.avg}${metricInfo.unit}`, 105, currentY, { align: 'center' });
        currentY += 20;
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
      if (!baseStation || !baseStation.BaseStationName) {
        console.warn('Invalid base station:', baseStation);
        continue;
      }
      console.log(`Fetching data for base station: ${baseStation.BaseStationName}`);
      const telemetryData = await PDFReport.fetchData(config.node, baseStation.BaseStationName, config.timeRange);
      console.log(`Received data for ${baseStation.BaseStationName}:`, {
        dataLength: telemetryData.length,
        sampleData: telemetryData.slice(0, 2)
      });
      allTelemetryData[baseStation.BaseStationName] = telemetryData;
    }

    // Generate PDF for each base station
    const pdf = new jsPDF();
    let isFirstPage = true;

    for (const baseStation of baseStations) {
      const telemetryData = allTelemetryData[baseStation.BaseStationName];
      if (!telemetryData || telemetryData.length === 0) continue;

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      await PDFReport.generateReport(telemetryData, config.node, baseStation.BaseStationName, pdf);
    }

    pdf.save(`${config.node}_telemetry_report.pdf`);

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
