import { useState, useCallback } from 'react';

const DICTIONARY = {
  en: {
    'app.title': 'Lightspeed Navigator',
    'app.credits': 'Credits',
    'app.fuel': 'Fuel',
    'a11y.skip': 'Skip to main content',
    
    // Contracts
    'contract.mining_basic': 'Resin Extraction: 0.5 Series',
    'contract.desc_mining': 'We need a shipment of raw 0.5 value resin for hull repairs. Avoid the others.',
    'contract.nav_survey': 'Sector Scan: Echo Buoy',
    'contract.desc_survey': 'Travel to the Echo Buoy to recalibrate our charts. High precision required.',
    'contract.supply_run': 'Urgent: Nav Computers',
    'contract.desc_supply': 'Craft and deliver 1 Navigation Computer to stabilize the trade route.',
  },
  es: {
    'app.title': 'Navegador Velocidad Luz',
    'app.credits': 'Créditos',
    'app.fuel': 'Combustible',
    'a11y.skip': 'Saltar al contenido principal',
    
    // Contracts
    'contract.mining_basic': 'Extracción: Serie 0.5',
    'contract.desc_mining': 'Necesitamos resina de valor 0.5 para reparaciones.',
    'contract.nav_survey': 'Escaneo: Boya Eco',
    'contract.desc_survey': 'Viaja a la Boya Eco para recalibrar las cartas.',
    'contract.supply_run': 'Urgente: Computadoras',
    'contract.desc_supply': 'Fabrica y entrega 1 Computadora de Navegación.',
  }
};

export const useTranslation = () => {
  const [lang, setLang] = useState('en');

  const t = useCallback((key) => {
    return DICTIONARY[lang][key] || key;
  }, [lang]);

  return { t, lang, setLang };
};