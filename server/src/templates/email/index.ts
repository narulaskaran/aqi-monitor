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
 * Parameters for air quality alert email
 */
export interface AirQualityAlertEmailParams {
  zipCode: string;
  aqi: number;
  alertLevel: string;
  category: string;
  alertColor: string;
  healthGuidance: string;
}

/**
 * Generates HTML for air quality alert email
 * @param params - Alert parameters
 * @returns HTML content
 */
export function airQualityAlertEmail(params: AirQualityAlertEmailParams): string {
  const { zipCode, aqi, alertLevel, category, alertColor, healthGuidance } = params;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568;">AQI Monitor Alert</h2>
      <p>The air quality in your area (ZIP: ${zipCode}) has reached a level of concern:</p>
      
      <div style="background-color: ${alertColor}20; border: 1px solid ${alertColor}; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="color: ${alertColor}; margin-top: 0;">Air Quality Index: ${aqi} - ${alertLevel}</h3>
        <p>${category}</p>
        <p><strong>Health Guidance:</strong> ${healthGuidance}</p>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 6px;">
        <h4 style="margin-top: 0;">What should you do?</h4>
        <ul>
          <li>Monitor local air quality reports</li>
          <li>Adjust your outdoor activities based on the AQI level</li>
          <li>If you have respiratory issues, keep medications on hand</li>
          <li>Consider using air purifiers indoors</li>
        </ul>
      </div>
      
      <p style="color: #718096; font-size: 14px; margin-top: 20px;">
        You're receiving this email because you subscribed to air quality alerts for ZIP code ${zipCode}.
      </p>
    </div>
  `;
}