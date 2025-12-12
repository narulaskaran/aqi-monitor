/**
 * Email templates for the application
 */

/**
 * Generates HTML for verification code email
 * @param {string} code - The verification code
 * @returns {string} HTML content
 */
export function verificationEmail(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">AQI Monitor Verification</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 24px; text-align: center; letter-spacing: 2px; font-weight: bold;">
        ${code}
      </div>
      <p style="color: #718096; font-size: 14px; margin-top: 20px;">
        This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;
}

/**
 * Parameters for air quality email
 */
export interface AirQualityEmailParams {
  zipCode: string;
  aqi: number;
  isGoodAirQuality: boolean;
  // For poor air quality
  alertLevel?: string;
  category?: string;
  alertColor?: string;
  healthGuidance?: string;
  // For good air quality
  dominantPollutant?: string;
  // Common
  unsubscribeToken: string;
  websiteUrl: string;
  subscriptionId: string;
}

/**
 * Generates HTML for air quality email (both good and poor air quality)
 * @param params - Air quality parameters
 * @returns HTML content
 */
export function airQualityEmail(params: AirQualityEmailParams): string {
  const {
    zipCode,
    aqi,
    isGoodAirQuality,
    alertLevel,
    category,
    alertColor,
    healthGuidance,
    dominantPollutant,
    unsubscribeToken,
    websiteUrl
  } = params;
  
  // Set default values for good air quality
  const title = isGoodAirQuality 
    ? "Good Air Quality Today!" 
    : `Air Quality Alert: ${alertLevel}`;
  
  const titleColor = isGoodAirQuality 
    ? "#48bb78" // Green
    : alertColor;
  
  const infoBoxBgColor = isGoodAirQuality 
    ? "#f0fff4" // Light green
    : "#f7fafc"; // Light gray
  
  const infoBoxBorderColor = isGoodAirQuality 
    ? "#48bb78" // Green
    : alertColor;
  
  const infoBoxTitleColor = isGoodAirQuality 
    ? "#2f855a" // Dark green
    : "#4a5568"; // Gray
  
  const infoBoxTitle = isGoodAirQuality 
    ? "What This Means" 
    : "Health Guidance";
  
  const infoBoxContent = isGoodAirQuality 
    ? `The air quality is satisfactory, and air pollution poses little or no risk. 
       The primary pollutant is ${dominantPollutant}, but levels are within a healthy range.`
    : healthGuidance;
  
  const mainContent = isGoodAirQuality
    ? `Good news! The current Air Quality Index (AQI) in your area (ZIP code: ${zipCode}) is <strong>${aqi}</strong>.
       This indicates good air quality with low levels of air pollution.`
    : `The current Air Quality Index (AQI) in your area (ZIP code: ${zipCode}) is <strong>${aqi}</strong>.
       This is considered <strong>${category}</strong>.`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${isGoodAirQuality ? "Good Air Quality Update" : "Air Quality Alert"}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h1 style="color: ${titleColor}; margin-bottom: 20px;">${title}</h1>
          
          <p style="margin-bottom: 15px;">
            ${mainContent}
          </p>

          <div style="background-color: ${infoBoxBgColor}; border-left: 4px solid ${infoBoxBorderColor}; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: ${infoBoxTitleColor}; margin-top: 0;">${infoBoxTitle}</h2>
            <p style="margin-bottom: 0;">${infoBoxContent}</p>
          </div>

          <p style="color: #718096; font-size: 0.875rem; margin-top: 30px;">
            You're receiving this email because you subscribed to air quality alerts.
            <br>
            <a href="${websiteUrl}/unsubscribe?token=${unsubscribeToken}" style="color: #4a5568; text-decoration: underline;">
              Unsubscribe from these alerts
            </a>
          </p>
        </div>
      </body>
    </html>
  `;
}