import jsPDF from 'jspdf';
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const generateRecommendation = (metric, current, avg, max, min) => {
  const thresholds = {
    forwardPower: { min: 10, max: 1000, unit: 'W' },
    reflectedPower: { min: 0, max: 10, unit: 'W' },
    vswr: { min: 1, max: 3, unit: '' },
    returnLoss: { min: -40, max: -10, unit: 'dB' },
    temperature: { min: 0, max: 50, unit: '°C' },
    voltage: { min: 11, max: 14, unit: 'V' }
  };

  const getStatus = (value, limits) => {
    if (value < limits.min) return 'low';
    if (value > limits.max) return 'high';
    return 'normal';
  };

  const formatValue = (value, unit) => {
    return `${value.toFixed(2)}${unit}`;
  };

  const limits = thresholds[metric];

  if (!limits) {
    return 'No recommendations available for this metric';
  }

  const status = getStatus(current, limits);
  const formattedCurrent = formatValue(current, limits.unit);
  const formattedMin = formatValue(limits.min, limits.unit);
  const formattedMax = formatValue(limits.max, limits.unit);

  switch (status) {
    case 'low':
      return `Current value (${formattedCurrent}) is below minimum threshold of ${formattedMin}. `;
    case 'high':
      return `Current value (${formattedCurrent}) is above maximum threshold of ${formattedMax}. `;
    default:
      return `Operating normally at ${formattedCurrent} (acceptable range: ${formattedMin} - ${formattedMax}).`;
  }
};

const generateAnalysis = (metric, data, title) => {
  if (!data || data.length === 0) {
    return {
      title,
      currentValue: 0,
      average: 0,
      percentageChange: 0,
      status: 'normal',
      recommendation: 'No valid data points'
    };
  }

  const values = data.map(item => parseFloat(item[metric])).filter(val => !isNaN(val));
  if (values.length === 0) {
    return {
      title,
      currentValue: 0,
      average: 0,
      percentageChange: 0,
      status: 'normal',
      recommendation: 'No valid data points'
    };
  }

  const currentValue = values[values.length - 1];
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const percentageChange = average !== 0 ? ((currentValue - average) / average) * 100 : 0;

  let status = 'normal';
  let recommendation = '';

  switch (metric) {
    case 'forwardPower':
      if (currentValue < 10) {
        status = 'warning';
        recommendation = 'Forward power is low. Check transmitter output.';
      }
      break;
    case 'reflectedPower':
      if (currentValue > 2) {
        status = 'warning';
        recommendation = 'High reflected power detected. Check antenna system.';
      }
      break;
    // Add other metrics analysis here
  }

  if (!recommendation) {
    recommendation = generateRecommendation(metric, currentValue, average, Math.max(...values), Math.min(...values));
  }

  return {
    title,
    currentValue,
    average,
    percentageChange,
    status,
    recommendation
  };
};

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const renderGraph = async (data, metric) => {
  if (!data || data.length === 0) return null;
  
  // Format timestamps for X-axis
  const formattedData = data.map(item => ({
    ...item,
    timestamp: formatDate(item.timestamp)
  }));

  // Downsample data for PDF graphs
  const targetPoints = 50;
  let graphData = data;
  if (data.length > targetPoints) {
    const step = Math.ceil(data.length / targetPoints);
    graphData = data.filter((_, index) => index % step === 0);
  }

  // Calculate Y-axis domain
  const values = graphData.map(item => parseFloat(item[metric.name]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1;
  const yDomain = [min - padding, max + padding];

  const chartContainer = document.createElement('div');
  chartContainer.style.width = '800px';
  chartContainer.style.height = '400px';
  chartContainer.style.position = 'fixed';
  chartContainer.style.left = '-9999px';
  chartContainer.style.backgroundColor = '#ffffff';
  document.body.appendChild(chartContainer);

  const chart = (
    <LineChart 
      width={800} 
      height={400} 
      data={graphData}
      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="timestamp"
        type="category"
        tick={{ fontSize: 12 }}
        angle={-45}
        textAnchor="end"
        tickFormatter={formatDate}
      />
      <YAxis 
        domain={yDomain}
        tickFormatter={(value) => value.toFixed(2)}
      />
      <Tooltip 
        formatter={(value) => value.toFixed(2)}
        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey={metric.name}
        stroke={getGraphColor(metric.name)}
        strokeWidth={2}
        dot={false}
        name={metric.title}
      />
    </LineChart>
  );

  const root = ReactDOM.createRoot(chartContainer);
  root.render(chart);

  // Wait for chart to render
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const canvas = await html2canvas(chartContainer, {
      logging: false,
      useCORS: true,
      scale: 2
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    root.unmount();
    document.body.removeChild(chartContainer);
    
    return imgData;
  } catch (error) {
    console.error('Error generating chart:', error);
    root.unmount();
    document.body.removeChild(chartContainer);
    throw error;
  }
};

const getGraphColor = (dataKey) => {
  switch (dataKey) {
    case 'forwardPower': return '#4CAF50';
    case 'reflectedPower': return '#F44336';
    case 'vswr': return '#2196F3';
    case 'returnLoss': return '#FF9800';
    case 'temperature': return '#E91E63';
    case 'voltage': return '#9C27B0';
    case 'current': return '#FF5722';
    case 'power': return '#607D8B';
    default: return '#757575';
  }
};

export const generatePDFReport = async (config, baseStations = []) => {
  try {
    if (!baseStations || baseStations.length === 0) {
      throw new Error('No base stations available for this node');
    }

    // 2. Process metrics
    const metrics = [
      { name: 'forwardPower', title: 'Forward Power', unit: 'W' },
      { name: 'reflectedPower', title: 'Reflected Power', unit: 'W' },
      { name: 'vswr', title: 'VSWR', unit: '' },
      { name: 'returnLoss', title: 'Return Loss', unit: 'dB' },
      { name: 'temperature', title: 'Temperature', unit: '°C' },
      { name: 'voltage', title: 'Voltage', unit: 'V' },
      { name: 'current', title: 'Current', unit: 'A' },
      { name: 'power', title: 'Power', unit: 'W' }
    ];

    // 3. Create PDF document (A4: 210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    let currentPage = 1;

    // Add header function
    const addHeader = () => {
      pdf.setFontSize(10);
      pdf.setTextColor(102, 102, 102);
      pdf.text(`Page ${currentPage}`, 180, 10);
      currentPage++;

      // Add footer
      pdf.setFontSize(8);
      pdf.text('Generated by BSI Telemetry Reporting System', 20, 287);
      pdf.text(new Date().toLocaleString(), 150, 287);
    };

    // Add first page header
    addHeader();

    // Add title with node name
    pdf.setFontSize(24);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${config.node} Report`, pdf.internal.pageSize.width / 2, 20, { align: 'center' });
    yPosition += 15;

    // Add report info with better date formatting and time range
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    const reportDate = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Convert time range to human-readable format
    const timeRangeText = {
      '5m': '5 minutes',
      '10m': '10 minutes',
      '30m': '30 minutes',
      '1h': '1 hour',
      '2h': '2 hours',
      '6h': '6 hours',
      '1d': '1 day',
      '2d': '2 days',
      '5d': '5 days',
      '1w': '1 week'
    }[config.timeRange] || config.timeRange;

    pdf.text(`Generated on: ${reportDate}`, 15, 30);
    pdf.text(`Time Range: Last ${timeRangeText}`, 15, 35);

    // Process each base station
    for (const baseStation of baseStations) {
      // Start each base station on a new page
      pdf.addPage();
      yPosition = 40;

      // Add base station header
      pdf.setFontSize(18);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Base Station: ${baseStation.name}`, pdf.internal.pageSize.width / 2, 20, { align: 'center' });
      
      // Add time range info under base station name
      pdf.setFontSize(10);
      pdf.setTextColor(102, 102, 102);
      pdf.text(`Time Range: Last ${timeRangeText}`, pdf.internal.pageSize.width / 2, 30, { align: 'center' });

      // Fetch telemetry data for this base station
      const telemetryResponse = await axios.get(`${API_BASE_URL}/api/telemetry/${config.node}/${baseStation.id}`, {
        params: {
          timeFilter: config.timeRange
        }
      });
      const telemetryData = telemetryResponse.data.data;

      // Process metrics for this base station
      let currentY = 40;
      const graphWidth = 180;
      const graphHeight = 80;
      for (const metric of metrics) {
        if (currentY + graphHeight + 50 > pdf.internal.pageSize.height) {
          pdf.addPage();
          addHeader();
          currentY = 40;
        }

        try {
          const graphDataUrl = await renderGraph(telemetryData, metric);
          if (graphDataUrl) {
            pdf.addImage(graphDataUrl, 'PNG', 15, currentY, graphWidth, graphHeight);
          }
        } catch (error) {
          console.error('Error adding graph to PDF:', error);
        }

        // Add analysis
        const analysis = generateAnalysis(metric.name, telemetryData, metric.title);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('Analysis:', 20, currentY + graphHeight + 15);
        pdf.setFont(undefined, 'normal');
        
        pdf.setFontSize(10);
        pdf.text(`Current ${metric.title}: ${analysis.currentValue.toFixed(2)} ${metric.unit}`, 20, currentY + graphHeight + 22);
        
        pdf.text(`Average: ${analysis.average.toFixed(2)} ${metric.unit}`, 20, currentY + graphHeight + 27);
        
        pdf.text(`Change: ${analysis.percentageChange.toFixed(2)}%`, 20, currentY + graphHeight + 32);
        
        pdf.text(`Status: ${analysis.status}`, 20, currentY + graphHeight + 37);
        
        // Handle recommendation text wrapping
        const maxWidth = graphWidth - 10; // Leave some margin
        const splitText = pdf.splitTextToSize(`Recommendation: ${analysis.recommendation}`, maxWidth);
        pdf.setFontSize(10);
        pdf.text(splitText[0], 20, currentY + graphHeight + 42);
        for (let i = 1; i < splitText.length; i++) {
          pdf.text(splitText[i], 20, currentY + graphHeight + 42 + (i * 5));
        }

        currentY += graphHeight + 50; // Move down for next metric
      }

      // Add some space between base stations
      yPosition += 20;

      // Check if we need a new page for the next base station
      if (yPosition > 250) {
        pdf.addPage();
        addHeader();
        yPosition = 20;
      }
    }

    // Save the PDF
    pdf.save(`${config.node}_telemetry_report.pdf`);

  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
};
