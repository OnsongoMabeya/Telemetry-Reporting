import React, { createContext, useContext, useState, useCallback } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [baseStations, setBaseStations] = useState([]);
  const [selectedBaseStation, setSelectedBaseStation] = useState(null);
  const [timeFilter, setTimeFilter] = useState('1h');
  const [telemetryData, setTelemetryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metricMappings, setMetricMappings] = useState([]);
  const [hasMappings, setHasMappings] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleNodeChange = useCallback((event) => {
    setSelectedNode(event.target.value);
    setSelectedBaseStation(null);
    setTelemetryData([]);
  }, []);

  const handleBaseStationChange = useCallback((event) => {
    setSelectedBaseStation(event.target.value);
  }, []);

  const handleTimeFilterChange = useCallback((event) => {
    setTimeFilter(event.target.value);
  }, []);

  const openReportModal = useCallback(() => {
    setReportModalOpen(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setReportModalOpen(false);
  }, []);

  const value = {
    nodes,
    setNodes,
    selectedNode,
    setSelectedNode,
    handleNodeChange,
    baseStations,
    setBaseStations,
    selectedBaseStation,
    setSelectedBaseStation,
    handleBaseStationChange,
    timeFilter,
    setTimeFilter,
    handleTimeFilterChange,
    telemetryData,
    setTelemetryData,
    isLoading,
    setIsLoading,
    error,
    setError,
    metricMappings,
    setMetricMappings,
    hasMappings,
    setHasMappings,
    reportModalOpen,
    openReportModal,
    closeReportModal,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
