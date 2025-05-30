import React, { useState, useEffect } from 'react';
import '../pages/styles/alerts.css';
import Sidebar from '../components/Sidebar';

const Alert = () => {
  const [userData, setUserData] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState({
    weather: null,
    airQuality: null,
    traffic: null,
    health: null,
    crime: null,
    markets: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Get user data from session storage
    const storedUserData = sessionStorage.getItem('userData');
    if (storedUserData) {
      try {
        const parsedData = JSON.parse(storedUserData);
        setUserData(parsedData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setEnvironmentalData(prev => ({ ...prev, error: 'Invalid user data format' }));
      }
    } else {
      setEnvironmentalData(prev => ({ ...prev, error: 'No user data found in session storage' }));
    }
  }, []);

  useEffect(() => {
    if (userData) {
      fetchEnvironmentalData();
    }
  }, [userData]);

  const fetchEnvironmentalData = async () => {
    try {
      setEnvironmentalData(prev => ({ ...prev, loading: true, error: null }));
      
      // Enhanced queries for comprehensive Indianapolis data
      const queries = [
        `Current weather Indianapolis Indiana today exact temperature humidity UV index wind speed feels like precipitation forecast real time conditions`,
        `Air quality index AQI Indianapolis Indiana today PM2.5 PM10 ozone nitrogen dioxide carbon monoxide pollution levels real time health advisory`,
        `Traffic conditions Indianapolis Indiana today I-65 I-70 I-465 road closures construction accidents congestion hotspots alternate routes real time`,
        `Indianapolis Indiana health alerts today COVID-19 updates pollen count allergens respiratory health air quality health advisory flu activity disease outbreak`,
        `Indianapolis Indiana crime reports today police incidents shootings robberies accidents emergency alerts public safety news recent crimes`,
        `Indianapolis Indiana market closures today business holidays bank holidays shopping centers closed government offices hours`
      ];

      const apiKey = '';
      
      if (!apiKey) {
        throw new Error('Perplexity API key not found');
      }

      const responses = await Promise.allSettled(
        queries.map(query => 
          fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.1-sonar-small-128k-online',
              messages: [
                {
                  role: 'user',
                  content: `Provide current real-time detailed data for Indianapolis, Indiana: ${query}. Include specific numbers, locations, times, and actionable information. Format response with clear data points.`
                }
              ],
              max_tokens: 1000,
              temperature: 0.1
            })
          }).then(res => {
            if (!res.ok) {
              throw new Error(`API request failed: ${res.status}`);
            }
            return res.json();
          })
        )
      );

      // Process responses
      const [weatherRes, airQualityRes, trafficRes, healthRes, crimeRes, marketsRes] = responses;
      
      setEnvironmentalData({
        weather: weatherRes.status === 'fulfilled' ? parseWeatherData(weatherRes.value) : null,
        airQuality: airQualityRes.status === 'fulfilled' ? parseAirQualityData(airQualityRes.value) : null,
        traffic: trafficRes.status === 'fulfilled' ? parseTrafficData(trafficRes.value) : null,
        health: healthRes.status === 'fulfilled' ? parseHealthData(healthRes.value) : null,
        crime: crimeRes.status === 'fulfilled' ? parseCrimeData(crimeRes.value) : null,
        markets: marketsRes.status === 'fulfilled' ? parseMarketsData(marketsRes.value) : null,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching environmental data:', error);
      setEnvironmentalData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch environmental data'
      }));
    }
  };

  // Enhanced parsing functions with better data extraction
  const parseWeatherData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      const lines = content.toLowerCase().split('\n');
      
      return {
        temperature: extractNumberFromText(content, ['temperature', 'temp'], '°f') || extractNumberFromText(content, ['°f']),
        feelsLike: extractNumberFromText(content, ['feels like', 'feel'], '°f') || 'N/A',
        humidity: extractNumberFromText(content, ['humidity'], '%') || 'N/A',
        uvIndex: extractNumberFromText(content, ['uv index', 'uv'], '') || 'N/A',
        windSpeed: extractNumberFromText(content, ['wind'], 'mph') || 'N/A',
        conditions: extractConditions(content) || 'N/A',
        precipitation: content.includes('rain') || content.includes('storm') || content.includes('precipitation'),
        heatWarning: content.includes('heat warning') || content.includes('excessive heat')
      };
    } catch (error) {
      return { temperature: 'N/A', conditions: 'N/A', humidity: 'N/A', uvIndex: 'N/A' };
    }
  };

  const parseAirQualityData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        aqi: extractNumberFromText(content, ['aqi', 'air quality index'], '') || 'N/A',
        quality: extractAirQuality(content) || 'N/A',
        pm25: extractNumberFromText(content, ['pm2.5', 'pm 2.5'], 'μg/m³') || 'N/A',
        pm10: extractNumberFromText(content, ['pm10', 'pm 10'], 'μg/m³') || 'N/A',
        ozone: extractNumberFromText(content, ['ozone', 'o3'], 'ppb') || 'N/A',
        pollutants: extractPollutants(content),
        healthImpact: extractHealthImpact(content)
      };
    } catch (error) {
      return { aqi: 'N/A', quality: 'N/A', pm25: 'N/A' };
    }
  };

  const parseTrafficData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        conditions: extractTrafficConditions(content) || 'Normal',
        closures: extractRoadClosures(content),
        accidents: extractAccidents(content),
        hotspots: extractTrafficHotspots(content),
        estimatedDelay: extractNumberFromText(content, ['delay', 'minutes'], 'min') || 'N/A'
      };
    } catch (error) {
      return { conditions: 'N/A', closures: [], accidents: [] };
    }
  };

  const parseHealthData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        covidUpdates: extractCovidInfo(content),
        pollenCount: extractPollenLevel(content) || 'N/A',
        allergens: extractAllergens(content),
        fluActivity: extractFluActivity(content) || 'Low',
        healthAdvisories: extractHealthAdvisories(content),
        airQualityHealth: content.includes('sensitive groups') || content.includes('health advisory')
      };
    } catch (error) {
      return { pollenCount: 'N/A', allergens: [], fluActivity: 'N/A' };
    }
  };

  const parseCrimeData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        incidents: extractCrimeIncidents(content),
        shootings: extractShootings(content),
        robberies: extractRobberies(content),
        accidents: extractAccidents(content),
        safetyAlerts: extractSafetyAlerts(content),
        areasToAvoid: extractHighCrimeAreas(content)
      };
    } catch (error) {
      return { incidents: [], shootings: [], robberies: [] };
    }
  };

  const parseMarketsData = (response) => {
    try {
      const content = response.choices?.[0]?.message?.content || '';
      
      return {
        bankHolidays: extractBankHolidays(content),
        marketClosures: extractMarketClosures(content),
        businessHours: extractBusinessHours(content),
        governmentOffices: extractGovOfficeHours(content)
      };
    } catch (error) {
      return { bankHolidays: [], marketClosures: [], businessHours: [] };
    }
  };

  // Helper functions for data extraction
  const extractNumberFromText = (text, keywords, unit) => {
    for (let keyword of keywords) {
      const regex = new RegExp(`${keyword}[:\\s]*([0-9]+(?:\\.[0-9]+)?)\\s*${unit}?`, 'i');
      const match = text.match(regex);
      if (match) return parseFloat(match[1]);
    }
    return null;
  };

  const extractConditions = (text) => {
    const conditions = ['sunny', 'clear', 'cloudy', 'partly cloudy', 'overcast', 'rainy', 'stormy', 'foggy', 'hazy'];
    for (let condition of conditions) {
      if (text.toLowerCase().includes(condition)) {
        return condition.replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    return null;
  };

  const extractAirQuality = (text) => {
    if (text.includes('good')) return 'Good';
    if (text.includes('moderate')) return 'Moderate';
    if (text.includes('unhealthy for sensitive')) return 'Unhealthy for Sensitive';
    if (text.includes('unhealthy')) return 'Unhealthy';
    if (text.includes('hazardous')) return 'Hazardous';
    return null;
  };

  const extractPollutants = (text) => {
    const pollutants = [];
    if (text.includes('pm2.5') || text.includes('pm 2.5')) pollutants.push('PM2.5');
    if (text.includes('pm10') || text.includes('pm 10')) pollutants.push('PM10');
    if (text.includes('ozone') || text.includes('o3')) pollutants.push('Ozone');
    if (text.includes('nitrogen')) pollutants.push('NO2');
    if (text.includes('carbon monoxide')) pollutants.push('CO');
    return pollutants;
  };

  const extractHealthImpact = (text) => {
    if (text.includes('sensitive groups') || text.includes('health advisory')) return 'Sensitive groups affected';
    if (text.includes('everyone') && text.includes('health')) return 'Health effects for everyone';
    return null;
  };

  const extractTrafficConditions = (text) => {
    if (text.includes('heavy') || text.includes('congestion') || text.includes('severe')) return 'Heavy';
    if (text.includes('moderate')) return 'Moderate';
    if (text.includes('light') || text.includes('minimal')) return 'Light';
    return 'Normal';
  };

  const extractRoadClosures = (text) => {
    const closures = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if ((line.includes('closure') || line.includes('closed') || line.includes('construction')) && 
          (line.includes('i-') || line.includes('interstate') || line.includes('street') || line.includes('road'))) {
        closures.push(line.trim());
      }
    });
    
    // Add specific Indianapolis highways if mentioned
    if (text.includes('i-65')) closures.push('I-65 - Check for construction delays');
    if (text.includes('i-70')) closures.push('I-70 - Potential restrictions');
    if (text.includes('i-465')) closures.push('I-465 - Monitor conditions');
    
    return closures.length > 0 ? closures.slice(0, 3) : ['No major closures reported'];
  };

  const extractAccidents = (text) => {
    const accidents = [];
    if (text.includes('accident') || text.includes('crash') || text.includes('collision')) {
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.includes('accident') || line.includes('crash')) {
          accidents.push(line.trim());
        }
      });
    }
    return accidents.slice(0, 2);
  };

  const extractTrafficHotspots = (text) => {
    const hotspots = [];
    const commonHotspots = ['downtown', 'i-65', 'i-70', 'i-465', 'meridian', 'keystone', 'college'];
    
    commonHotspots.forEach(spot => {
      if (text.toLowerCase().includes(spot) && (text.includes('traffic') || text.includes('congestion'))) {
        hotspots.push(spot.toUpperCase());
      }
    });
    
    return hotspots;
  };

  const extractCovidInfo = (text) => {
    const covidInfo = [];
    if (text.includes('covid') || text.includes('coronavirus')) {
      if (text.includes('cases')) covidInfo.push('Case updates available');
      if (text.includes('variant')) covidInfo.push('New variant information');
      if (text.includes('vaccination')) covidInfo.push('Vaccination updates');
    }
    return covidInfo;
  };

  const extractPollenLevel = (text) => {
    if (text.includes('high') && text.includes('pollen')) return 'High';
    if (text.includes('moderate') && text.includes('pollen')) return 'Moderate';
    if (text.includes('low') && text.includes('pollen')) return 'Low';
    return null;
  };

  const extractAllergens = (text) => {
    const allergens = [];
    if (text.includes('tree pollen') || text.includes('tree')) allergens.push('Tree pollen');
    if (text.includes('grass pollen') || text.includes('grass')) allergens.push('Grass pollen');
    if (text.includes('ragweed')) allergens.push('Ragweed');
    if (text.includes('mold') || text.includes('mould')) allergens.push('Mold spores');
    if (text.includes('dust')) allergens.push('Dust');
    return allergens;
  };

  const extractFluActivity = (text) => {
    if (text.includes('high') && text.includes('flu')) return 'High';
    if (text.includes('moderate') && text.includes('flu')) return 'Moderate';
    if (text.includes('low') && text.includes('flu')) return 'Low';
    return null;
  };

  const extractHealthAdvisories = (text) => {
    const advisories = [];
    if (text.includes('health advisory') || text.includes('health alert')) {
      advisories.push('Health advisory issued');
    }
    if (text.includes('air quality') && text.includes('sensitive')) {
      advisories.push('Air quality advisory for sensitive groups');
    }
    return advisories;
  };

  const extractCrimeIncidents = (text) => {
    const incidents = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.includes('incident') || line.includes('report') || line.includes('crime')) {
        incidents.push(line.trim());
      }
    });
    
    return incidents.slice(0, 3);
  };

  const extractShootings = (text) => {
    const shootings = [];
    if (text.includes('shooting') || text.includes('shot') || text.includes('gunfire')) {
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.includes('shooting') || line.includes('shot')) {
          shootings.push(line.trim());
        }
      });
    }
    return shootings.slice(0, 2);
  };

  const extractRobberies = (text) => {
    const robberies = [];
    if (text.includes('robbery') || text.includes('theft') || text.includes('burglary')) {
      const lines = text.split('\n');
      lines.forEach(line => {
        if (line.includes('robbery') || line.includes('theft')) {
          robberies.push(line.trim());
        }
      });
    }
    return robberies.slice(0, 2);
  };

  const extractSafetyAlerts = (text) => {
    const alerts = [];
    if (text.includes('alert') || text.includes('warning') || text.includes('emergency')) {
      alerts.push('Safety alert issued');
    }
    return alerts;
  };

  const extractHighCrimeAreas = (text) => {
    const areas = [];
    const commonAreas = ['downtown', 'east side', 'west side', 'north side', 'south side'];
    
    commonAreas.forEach(area => {
      if (text.toLowerCase().includes(area) && (text.includes('avoid') || text.includes('caution'))) {
        areas.push(area);
      }
    });
    
    return areas;
  };

  const extractBankHolidays = (text) => {
    const holidays = [];
    if (text.includes('bank holiday') || text.includes('federal holiday')) {
      holidays.push('Bank holiday today');
    }
    return holidays;
  };

  const extractMarketClosures = (text) => {
    const closures = [];
    if (text.includes('market closed') || text.includes('stock market')) {
      closures.push('Stock market closure');
    }
    return closures;
  };

  const extractBusinessHours = (text) => {
    const hours = [];
    if (text.includes('limited hours') || text.includes('early closure')) {
      hours.push('Limited business hours');
    }
    return hours;
  };

  const extractGovOfficeHours = (text) => {
    const hours = [];
    if (text.includes('government') && (text.includes('closed') || text.includes('limited'))) {
      hours.push('Government offices affected');
    }
    return hours;
  };

  // Enhanced personalized recommendations
  const generatePersonalizedRecommendations = () => {
    if (!userData || environmentalData.loading) return [];
    
    const recommendations = [];
    const { weather, airQuality, traffic, health, crime } = environmentalData;

    // Weather-based recommendations
    if (weather) {
      // UV Protection recommendations
      const uvIndex = parseInt(weather.uvIndex) || 0;
      if (uvIndex >= 8) {
        recommendations.push({
          type: 'weather',
          icon: '☀️',
          title: 'Extreme UV Alert',
          message: `UV Index ${uvIndex}: Apply SPF 50+ sunscreen every 2 hours. Wear wide-brim hat, UV-blocking sunglasses. Seek shade 10AM-4PM.`,
          priority: 'high'
        });
      } else if (uvIndex >= 6) {
        recommendations.push({
          type: 'weather',
          icon: '🌤️',
          title: 'High UV Protection',
          message: `UV Index ${uvIndex}: Use SPF 30+ sunscreen. Reapply every 2 hours. Wear protective clothing.`,
          priority: 'medium'
        });
      } else if (uvIndex >= 3) {
        recommendations.push({
          type: 'weather',
          icon: '🧴',
          title: 'UV Protection',
          message: `UV Index ${uvIndex}: SPF 15+ recommended for extended outdoor time.`,
          priority: 'low'
        });
      }

      // Temperature-based recommendations
      if (weather.temperature !== 'N/A') {
        const temp = parseInt(weather.temperature);
        if (temp > 95) {
          recommendations.push({
            type: 'weather',
            icon: '🥵',
            title: 'Extreme Heat Warning',
            message: `${temp}°F: Stay indoors during peak hours. Drink water every 15-20 minutes. ${userData.bloodGroup === 'B+' ? 'B+ blood type may be more sensitive to heat stress.' : ''}`,
            priority: 'high'
          });
        } else if (temp < 32) {
          recommendations.push({
            type: 'weather',
            icon: '🥶',
            title: 'Freezing Alert',
            message: `${temp}°F: Dress in layers. Protect extremities. Check tire pressure and battery.`,
            priority: 'high'
          });
        }
      }

      // Precipitation recommendations
      if (weather.precipitation) {
        recommendations.push({
          type: 'weather',
          icon: '☔',
          title: 'Rain Expected - Take Precautions',
          message: `${userData.name}, carry waterproof jacket and umbrella. Allow extra 10-15 minutes for travel from ${userData.location.address}.`,
          priority: 'high'
        });
      }

      // Heat warning
      if (weather.heatWarning) {
        recommendations.push({
          type: 'weather',
          icon: '🌡️',
          title: 'Heat Warning Issued',
          message: 'Official heat warning in effect. Limit outdoor activities. Stay hydrated. Check on elderly neighbors.',
          priority: 'high'
        });
      }
    }

    // Air Quality recommendations
    if (airQuality) {
      const aqi = parseInt(airQuality.aqi) || 0;
      
      if (aqi > 150) {
        recommendations.push({
          type: 'air',
          icon: '😷',
          title: 'Unhealthy Air - Mask Required',
          message: `AQI ${aqi}: Wear N95/KN95 mask outdoors. Avoid outdoor exercise. Close windows. Use air purifier if available.`,
          priority: 'high'
        });
      } else if (aqi > 100) {
        recommendations.push({
          type: 'air',
          icon: '😐',
          title: 'Moderate Air Quality',
          message: `AQI ${aqi}: Consider mask for sensitive individuals. Limit prolonged outdoor exertion.`,
          priority: 'medium'
        });
      }

      // PM2.5 specific recommendations
      if (airQuality.pm25 !== 'N/A' && parseInt(airQuality.pm25) > 35) {
        recommendations.push({
          type: 'air',
          icon: '🌫️',
          title: 'High Fine Particle Levels',
          message: `PM2.5: ${airQuality.pm25} μg/m³. Use KN95 mask outdoors. Run air purifier indoors. ${userData.allergies.length > 0 ? 'Extra caution due to your allergies.' : ''}`,
          priority: 'high'
        });
      }

      // Health impact recommendations
      if (airQuality.healthImpact) {
        recommendations.push({
          type: 'air',
          icon: '🫁',
          title: 'Air Quality Health Advisory',
          message: `${airQuality.healthImpact}. ${userData.medications.length > 0 ? 'Monitor symptoms if taking respiratory medications.' : ''}`,
          priority: 'medium'
        });
      }
    }

    // Traffic recommendations
    if (traffic) {
      if (traffic.conditions === 'Heavy') {
        recommendations.push({
          type: 'traffic',
          icon: '🚗',
          title: 'Heavy Traffic Alert',
          message: `Heavy congestion expected. ${traffic.estimatedDelay !== 'N/A' ? `Allow extra ${traffic.estimatedDelay} minutes.` : 'Allow extra travel time.'} Consider alternate routes.`,
          priority: 'medium'
        });
      }

      // Road closures
      if (traffic.closures && traffic.closures.length > 0 && traffic.closures[0] !== 'No major closures reported') {
        traffic.closures.forEach((closure, index) => {
          if (index < 2) { // Limit to 2 most important closures
            recommendations.push({
              type: 'traffic',
              icon: '🚧',
              title: 'Road Closure Alert',
              message: `${closure}. Plan alternate route from ${userData.location.address}. Use navigation app for real-time updates.`,
              priority: 'medium'
            });
          }
        });
      }

      // Traffic hotspots
      if (traffic.hotspots && traffic.hotspots.length > 0) {
        recommendations.push({
          type: 'traffic',
          icon: '🔥',
          title: 'Traffic Hotspots',
          message: `Congestion at: ${traffic.hotspots.join(', ')}. Avoid these areas during peak hours.`,
          priority: 'low'
        });
      }

      // Accidents
      if (traffic.accidents && traffic.accidents.length > 0) {
        recommendations.push({
          type: 'traffic',
          icon: '🚨',
          title: 'Traffic Accidents Reported',
          message: 'Multiple accidents reported. Drive carefully and allow extra time. Consider public transport.',
          priority: 'medium'
        });
      }
    }

    // Health recommendations
    if (health) {
      // Pollen recommendations
      if (health.pollenCount === 'High') {
        const userHasAllergies = userData.allergies && userData.allergies.length > 0;
        recommendations.push({
          type: 'health',
          icon: '🤧',
          title: 'High Pollen Alert',
          message: `High pollen levels detected. ${userHasAllergies ? 'Take antihistamine as prescribed.' : 'Consider antihistamine if sensitive.'} Keep windows closed. Shower after outdoor activities.`,
          priority: userHasAllergies ? 'high' : 'medium'
        });
      }

      // Allergen-specific recommendations
      if (health.allergens && health.allergens.length > 0) {
        const userAllergens = userData.allergies || [];
        const matchingAllergens = health.allergens.filter(allergen => 
          userAllergens.some(userAllergen => 
            allergen.toLowerCase().includes(userAllergen.toLowerCase())
          )
        );

        if (matchingAllergens.length > 0) {
          recommendations.push({
            type: 'health',
            icon: '⚠️',
            title: 'Personal Allergen Alert',
            message: `Your allergens detected: ${matchingAllergens.join(', ')}. Take preventive medication. Limit outdoor exposure.`,
            priority: 'high'
          });
        }
      }

      // Flu activity
      if (health.fluActivity === 'High') {
        recommendations.push({
          type: 'health',
          icon: '🦠',
          title: 'High Flu Activity',
          message: 'Flu activity is high in the area. Wash hands frequently. Avoid crowded spaces. Consider wearing mask in public.',
          priority: 'medium'
        });
      }

      // COVID updates
      if (health.covidUpdates && health.covidUpdates.length > 0) {
        recommendations.push({
          type: 'health',
          icon: '😷',
          title: 'COVID-19 Updates',
          message: `${health.covidUpdates.join(', ')}. Follow current health guidelines.`,
          priority: 'medium'
        });
      }

      // Air quality health advisory
      if (health.airQualityHealth) {
        recommendations.push({
          type: 'health',
          icon: '🫁',
          title: 'Air Quality Health Advisory',
          message: 'Sensitive groups should limit outdoor activities. Monitor respiratory symptoms.',
          priority: 'medium'
        });
      }
    }

    // Crime and safety recommendations
    if (crime) {
      // Shootings
      if (crime.shootings && crime.shootings.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '🚨',
          title: 'Safety Alert - Shootings Reported',
          message: 'Recent shooting incidents reported. Stay alert. Avoid isolated areas. Report suspicious activity.',
          priority: 'high'
        });
      }

      // Robberies
      if (crime.robberies && crime.robberies.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '🔒',
          title: 'Security Alert - Robberies',
          message: 'Robbery incidents reported in area. Secure valuables. Travel in well-lit areas. Use ride-share for evening travel.',
          priority: 'high'
        });
      }

      // Areas to avoid
      if (crime.areasToAvoid && crime.areasToAvoid.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '📍',
          title: 'Areas of Concern',
          message: `Exercise caution in: ${crime.areasToAvoid.join(', ')}. Plan safer alternate routes.`,
          priority: 'medium'
        });
      }

      // General safety alerts
      if (crime.safetyAlerts && crime.safetyAlerts.length > 0) {
        recommendations.push({
          type: 'safety',
          icon: '⚠️',
          title: 'Safety Advisory',
          message: 'Safety alert issued for the area. Stay vigilant and follow local law enforcement updates.',
          priority: 'medium'
        });
      }
    }

    // Market and business recommendations
    if (environmentalData.markets) {
      const { bankHolidays, marketClosures, businessHours } = environmentalData.markets;
      
      if (bankHolidays && bankHolidays.length > 0) {
        recommendations.push({
          type: 'business',
          icon: '🏦',
          title: 'Bank Holiday Notice',
          message: 'Banks are closed today. Plan banking activities accordingly. ATMs remain available.',
          priority: 'low'
        });
      }

      if (marketClosures && marketClosures.length > 0) {
        recommendations.push({
          type: 'business',
          icon: '📈',
          title: 'Market Closure',
          message: 'Stock market closure affects trading today. Plan investment activities accordingly.',
          priority: 'low'
        });
      }

      if (businessHours && businessHours.length > 0) {
        recommendations.push({
          type: 'business',
          icon: '🏢',
          title: 'Limited Business Hours',
          message: 'Some businesses have limited hours today. Call ahead to confirm availability.',
          priority: 'low'
        });
      }
    }

    // Personalized medication reminders based on conditions
    if (userData.medications && userData.medications.length > 0) {
      // Air quality medication reminders
      if (airQuality && (parseInt(airQuality.aqi) > 100 || airQuality.quality === 'Unhealthy')) {
        const respiratoryMeds = userData.medications.filter(med => 
          med.toLowerCase().includes('inhaler') || 
          med.toLowerCase().includes('albuterol') || 
          med.toLowerCase().includes('steroid')
        );
        
        if (respiratoryMeds.length > 0) {
          recommendations.push({
            type: 'medication',
            icon: '💊',
            title: 'Respiratory Medication Reminder',
            message: `Poor air quality detected. Keep your ${respiratoryMeds.join(', ')} readily available. Consider preemptive use if prescribed.`,
            priority: 'high'
          });
        }
      }

      // Heat-related medication warnings
      if (weather && weather.temperature !== 'N/A' && parseInt(weather.temperature) > 85) {
        const heatSensitiveMeds = userData.medications.filter(med => 
          med.toLowerCase().includes('blood pressure') || 
          med.toLowerCase().includes('diuretic') || 
          med.toLowerCase().includes('beta blocker')
        );
        
        if (heatSensitiveMeds.length > 0) {
          recommendations.push({
            type: 'medication',
            icon: '🌡️',
            title: 'Heat & Medication Advisory',
            message: `High temperature may affect medication effectiveness. Stay extra hydrated. Monitor for unusual symptoms.`,
            priority: 'medium'
          });
        }
      }
    }

    // Blood group specific recommendations
    if (userData.bloodGroup) {
      // Blood type specific heat sensitivity (B+ mentioned in original code)
      if (weather && weather.temperature !== 'N/A' && parseInt(weather.temperature) > 90) {
        if (userData.bloodGroup === 'B+') {
          recommendations.push({
            type: 'health',
            icon: '🩸',
            title: 'Blood Type Heat Advisory',
            message: 'B+ blood type may have increased heat sensitivity. Take extra precautions: frequent hydration breaks, seek AC when possible.',
            priority: 'medium'
          });
        }
      }
    }

    // Age-specific recommendations
    const userAge = userData.age || 0;
    if (userAge > 65) {
      // Senior-specific heat warnings
      if (weather && weather.temperature !== 'N/A' && parseInt(weather.temperature) > 85) {
        recommendations.push({
          type: 'health',
          icon: '👴',
          title: 'Senior Heat Safety',
          message: 'Extra heat precautions for seniors: Check in with family, stay indoors during peak hours, monitor for heat exhaustion symptoms.',
          priority: 'high'
        });
      }

      // Senior-specific air quality
      if (airQuality && parseInt(airQuality.aqi) > 100) {
        recommendations.push({
          type: 'health',
          icon: '👵',
          title: 'Senior Air Quality Alert',
          message: 'Seniors are more sensitive to air pollution. Avoid outdoor activities, keep windows closed, use air purifier.',
          priority: 'high'
        });
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  };

  if (environmentalData.loading) {
    return (
      <div className="alert-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Fetching real-time environmental data for Indianapolis...</p>
        </div>
      </div>
    );
  }

  if (environmentalData.error) {
    return (
      <div className="alert-container">
        <div className="alert-error">
          <h3>Unable to fetch environmental data</h3>
          <p>{environmentalData.error}</p>
          <button onClick={fetchEnvironmentalData} style={{ marginTop: '10px', padding: '8px 16px', backgroundColor: '#01a9c2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recommendations = generatePersonalizedRecommendations();

  return (
    <div style={{display:'flex', flexDirection:'row', zIndex:-1000}}>
    <Sidebar/>
    <div className="alert-container">
      <div className="alert-header">
        <h1 className="alert-title">Environmental Alerts & Recommendations</h1>
        {userData && (
          <div className="user-location">
            <span className="location-icon">📍</span>
            <span>{'Indianapolis, IN'}</span>
          </div>
        )}
      </div>

      {/* Environmental Data Grid */}
      <div className="environmental-grid">
        {/* Weather Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🌤️</span>
            <h3>Weather Conditions</h3>
          </div>
          <div className="card-content">
            {environmentalData.weather ? (
              <>
                <div className="weather-info">
                  <div className="temp">{environmentalData.weather.temperature}°F</div>
                  <div>
                    <div className="condition">{environmentalData.weather.conditions}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      Feels like {environmentalData.weather.feelsLike}°F
                    </div>
                  </div>
                </div>
                <div className="weather-details">
                  <div className="detail">
                    <span>Humidity</span>
                    <span>{environmentalData.weather.humidity}%</span>
                  </div>
                  <div className="detail">
                    <span>UV Index</span>
                    <span>{environmentalData.weather.uvIndex}</span>
                  </div>
                  <div className="detail">
                    <span>Wind</span>
                    <span>{environmentalData.weather.windSpeed} mph</span>
                  </div>
                </div>
                {environmentalData.weather.heatWarning && (
                  <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#3a1a1a', borderRadius: '6px', color: '#ff6b6b' }}>
                    ⚠️ Heat Warning in Effect
                  </div>
                )}
              </>
            ) : (
              <p>Weather data unavailable</p>
            )}
          </div>
        </div>

        {/* Air Quality Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🌫️</span>
            <h3>Air Quality</h3>
          </div>
          <div className="card-content">
            {environmentalData.airQuality ? (
              <>
                <div className="aqi-info">
                  <div className="aqi-value">{environmentalData.airQuality.aqi}</div>
                  <div>
                    <div className="aqi-level">{environmentalData.airQuality.quality}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      PM2.5: {environmentalData.airQuality.pm25}
                    </div>
                  </div>
                </div>
                {environmentalData.airQuality.pollutants.length > 0 && (
                  <div className="pollutants">
                    Main pollutants: {environmentalData.airQuality.pollutants.join(', ')}
                  </div>
                )}
                {environmentalData.airQuality.healthImpact && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#ffa500' }}>
                    ⚠️ {environmentalData.airQuality.healthImpact}
                  </div>
                )}
              </>
            ) : (
              <p>Air quality data unavailable</p>
            )}
          </div>
        </div>

        {/* Traffic Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🚗</span>
            <h3>Traffic Conditions</h3>
          </div>
          <div className="card-content">
            {environmentalData.traffic ? (
              <>
                <div className="traffic-status">{environmentalData.traffic.conditions}</div>
                {environmentalData.traffic.estimatedDelay !== 'N/A' && (
                  <div style={{ fontSize: '14px', color: '#ffa500', marginBottom: '12px' }}>
                    Estimated delay: {environmentalData.traffic.estimatedDelay}
                  </div>
                )}
                <div className="traffic-alerts">
                  {environmentalData.traffic.closures.map((closure, index) => (
                    <div key={index} className="alert-item">🚧 {closure}</div>
                  ))}
                  {environmentalData.traffic.accidents.map((accident, index) => (
                    <div key={index} className="alert-item">🚨 {accident}</div>
                  ))}
                </div>
                {environmentalData.traffic.hotspots.length > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '12px' }}>
                    <strong>Congestion at:</strong> {environmentalData.traffic.hotspots.join(', ')}
                  </div>
                )}
              </>
            ) : (
              <p>Traffic data unavailable</p>
            )}
          </div>
        </div>

        {/* Health Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🏥</span>
            <h3>Health Alerts</h3>
          </div>
          <div className="card-content">
            {environmentalData.health ? (
              <div className="health-info">
                <div className="pollen">
                  🌸 Pollen: {environmentalData.health.pollenCount}
                </div>
                <div style={{ fontSize: '14px', color: '#ccc' }}>
                  🦠 Flu Activity: {environmentalData.health.fluActivity}
                </div>
                {environmentalData.health.allergens.length > 0 && (
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    <strong>Allergens:</strong> {environmentalData.health.allergens.join(', ')}
                  </div>
                )}
                {environmentalData.health.covidUpdates.length > 0 && (
                  <div className="covid-alert">
                    📢 {environmentalData.health.covidUpdates.join(', ')}
                  </div>
                )}
                {environmentalData.health.healthAdvisories.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#ffa500' }}>
                    {environmentalData.health.healthAdvisories.map((advisory, index) => (
                      <div key={index}>⚠️ {advisory}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p>Health data unavailable</p>
            )}
          </div>
        </div>

        {/* Crime & Safety Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🚨</span>
            <h3>Safety Alerts</h3>
          </div>
          <div className="card-content">
            {environmentalData.crime ? (
              <div>
                {environmentalData.crime.shootings.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {environmentalData.crime.shootings.map((shooting, index) => (
                      <div key={index} className="alert-item" style={{ backgroundColor: '#3a1a1a', color: '#ff6b6b' }}>
                        🔫 {shooting}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.robberies.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {environmentalData.crime.robberies.map((robbery, index) => (
                      <div key={index} className="alert-item" style={{ backgroundColor: '#3a1a1a', color: '#ffa500' }}>
                        💰 {robbery}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.incidents.length > 0 && (
                  <div>
                    {environmentalData.crime.incidents.map((incident, index) => (
                      <div key={index} className="alert-item">
                        📋 {incident}
                      </div>
                    ))}
                  </div>
                )}
                {environmentalData.crime.areasToAvoid.length > 0 && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#ffa500' }}>
                    <strong>Exercise caution:</strong> {environmentalData.crime.areasToAvoid.join(', ')}
                  </div>
                )}
                {environmentalData.crime.safetyAlerts.length === 0 && environmentalData.crime.shootings.length === 0 && environmentalData.crime.robberies.length === 0 && (
                  <p style={{ color: '#01a9c2' }}>✅ No major safety alerts</p>
                )}
              </div>
            ) : (
              <p>Safety data unavailable</p>
            )}
          </div>
        </div>

        {/* Business & Markets Card */}
        <div className="env-card">
          <div className="card-header">
            <span className="card-icon">🏦</span>
            <h3>Business & Markets</h3>
          </div>
          <div className="card-content">
            {environmentalData.markets ? (
              <div>
                {environmentalData.markets.bankHolidays.length > 0 && (
                  <div className="alert-item">
                    🏦 {environmentalData.markets.bankHolidays[0]}
                  </div>
                )}
                {environmentalData.markets.marketClosures.length > 0 && (
                  <div className="alert-item">
                    📈 {environmentalData.markets.marketClosures[0]}
                  </div>
                )}
                {environmentalData.markets.businessHours.length > 0 && (
                  <div className="alert-item">
                    🏢 {environmentalData.markets.businessHours[0]}
                  </div>
                )}
                {environmentalData.markets.governmentOffices.length > 0 && (
                  <div className="alert-item">
                    🏛️ {environmentalData.markets.governmentOffices[0]}
                  </div>
                )}
                {environmentalData.markets.bankHolidays.length === 0 && 
                 environmentalData.markets.marketClosures.length === 0 && 
                 environmentalData.markets.businessHours.length === 0 && (
                  <p style={{ color: '#01a9c2' }}>✅ Normal business operations</p>
                )}
              </div>
            ) : (
              <p>Business data unavailable</p>
            )}
          </div>
        </div>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h2 className="recommendations-title">
            {userData ? `Personalized Recommendations for ${userData.name}` : 'Daily Recommendations'}
          </h2>
          <div className="recommendations-grid">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card priority-${rec.priority}`}>
                <div className="rec-icon">{rec.icon}</div>
                <div className="rec-content">
                  <h4 className="rec-title">{rec.title}</h4>
                  <p className="rec-message">{rec.message}</p>
                </div>
                <div className={`priority-indicator ${rec.priority}`}></div>
              </div>
            ))}
          </div>
        </div>
      )}

     
    </div>
    </div>
  );
};

export default Alert;
