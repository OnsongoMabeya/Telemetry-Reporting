import jsPDF from 'jspdf';
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const generateAnalysis = (metric, data, title) => {
  if (!data || data.length === 0) {
    return {
      title,
      currentValue: 0,
      average: 0,
      percentageChange: 0,
      status: 'normal',
      recommendation: 'No data available'
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

  return {
    title,
    currentValue,
    average,
    percentageChange,
    status,
    recommendation
  };
};

const renderGraph = async (data, metric) => {
  if (!data || data.length === 0) return null;

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
        tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
        interval="preserveStartEnd"
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

    // Add report info
    pdf.setFontSize(10);
    pdf.setTextColor(102, 102, 102);
    pdf.text(`Time Range: ${config.timeRange}`, 20, yPosition);
    yPosition += 15;

    // Process each base station
    for (const baseStation of baseStations) {
      // Add base station header
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Base Station: ${baseStation.name}`, 20, yPosition);
      yPosition += 10;

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
