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
  unsubscribeToken: string;
  websiteUrl: string;
}

/**
 * Generates HTML for air quality alert email
 * @param params - Alert parameters
 * @returns HTML content
 */
export function airQualityAlertEmail(params: AirQualityAlertEmailParams): string {
  const {
    zipCode,
    aqi,
    alertLevel,
    category,
    alertColor,
    healthGuidance,
    unsubscribeToken,
    websiteUrl
  } = params;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Air Quality Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h1 style="color: ${alertColor}; margin-bottom: 20px;">Air Quality Alert: ${alertLevel}</h1>
          
          <p style="margin-bottom: 15px;">
            The current Air Quality Index (AQI) in your area (ZIP code: ${zipCode}) is <strong>${aqi}</strong>.
            This is considered <strong>${category}</strong>.
          </p>

          <div style="background-color: #f7fafc; border-left: 4px solid ${alertColor}; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #4a5568; margin-top: 0;">Health Guidance</h2>
            <p style="margin-bottom: 0;">${healthGuidance}</p>
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

/**
 * Parameters for good air quality email
 */
export interface GoodAirQualityEmailParams {
  zipCode: string;
  aqi: number;
  dominantPollutant: string;
  unsubscribeToken: string;
  websiteUrl: string;
}

/**
 * Generates HTML for good air quality email
 * @param params - Good air quality parameters
 * @returns HTML content
 */
export function goodAirQualityEmail(params: GoodAirQualityEmailParams): string {
  const {
    zipCode,
    aqi,
    dominantPollutant,
    unsubscribeToken,
    websiteUrl
  } = params;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Good Air Quality Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #48bb78; margin-bottom: 20px;">Good Air Quality Today!</h1>
          
          <p style="margin-bottom: 15px;">
            Good news! The current Air Quality Index (AQI) in your area (ZIP code: ${zipCode}) is <strong>${aqi}</strong>.
            This indicates good air quality with low levels of air pollution.
          </p>

          <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #2f855a; margin-top: 0;">What This Means</h2>
            <p style="margin-bottom: 0;">
              The air quality is satisfactory, and air pollution poses little or no risk. 
              The primary pollutant is ${dominantPollutant}, but levels are within a healthy range.
            </p>
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