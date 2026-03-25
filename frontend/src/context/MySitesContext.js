import React, { createContext, useContext, useState } from 'react';

const MySitesContext = createContext();

export const useMySites = () => {
  const context = useContext(MySitesContext);
  if (!context) {
    throw new Error('useMySites must be used within MySitesProvider');
  }
  return context;
};

export const MySitesProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [timeFilter, setTimeFilter] = useState('1h');

  const value = {
    clients,
    setClients,
    selectedClient,
    setSelectedClient,
    services,
    setServices,
    selectedService,
    setSelectedService,
    timeFilter,
    setTimeFilter,
  };

  return (
    <MySitesContext.Provider value={value}>
      {children}
    </MySitesContext.Provider>
  );
};
