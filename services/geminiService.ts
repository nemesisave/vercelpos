import { GoogleGenAI, Type } from "@google/genai";
import type { Permission, Product, CompletedOrder, AuditLog } from '../types';
import { ALL_PERMISSIONS } from "../constants";

// Fix: Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getRolePermissionSuggestions = async (roleName: string): Promise<Permission[]> => {
  // Fix: Implement role permission suggestions using Gemini AI
  if (!process.env.API_KEY) {
    console.warn('API_KEY environment variable not set. Gemini AI features are disabled.');
    return [];
  }
  
  const model = 'gemini-2.5-flash';
  
  const prompt = `
    Based on the role name "${roleName}", suggest a set of permissions.
    The available permissions are: ${ALL_PERMISSIONS.join(', ')}.
    Return a JSON object with a "permissions" key, which is an array of strings. Each string must be one of the available permissions.
    For example, for a "Sales Manager", you might suggest ["CAN_VIEW_DASHBOARD_REPORTS", "CAN_VIEW_SALES_HISTORY"].
    Only include permissions from the provided list.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            permissions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ['permissions']
        },
      },
    });

    const jsonString = response.text.trim();
    const result = JSON.parse(jsonString);
    
    if (result.permissions && Array.isArray(result.permissions)) {
      // Filter to ensure only valid permissions are returned
      return result.permissions.filter((p: any) => ALL_PERMISSIONS.includes(p));
    }
    
    return [];
  } catch (error) {
    console.error("Error getting role permission suggestions from Gemini:", error);
    throw new Error("Failed to get suggestions from AI.");
  }
};

export const getBusinessAnalysis = async (products: Product[], completedOrders: CompletedOrder[], baseCurrencyCode: string): Promise<string> => {
  // Fix: Implement business analysis using Gemini AI
  if (!process.env.API_KEY) {
    console.warn('API_KEY environment variable not set. Gemini AI features are disabled.');
    throw new Error('Gemini/Google AI is disabled in this deployment.');
  }

  const model = 'gemini-2.5-pro';

  // To avoid sending too much data, let's summarize it.
  const top5ProductsByStock = products.sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 5).map(p => ({ name: p.name, stock: p.stock, price: p.price[baseCurrencyCode] }));
  const recent5Orders = completedOrders.slice(0, 5).map(o => ({ total: o.total, itemCount: o.items.length, date: o.date }));

  const prompt = `
    Analyze the business performance for a Point of Sale system. The base currency is ${baseCurrencyCode}.

    **Current Inventory (Top 5 products by stock):**
    ${JSON.stringify(top5ProductsByStock, null, 2)}
    
    **Recent Sales (Last 5 orders):**
    ${JSON.stringify(recent5Orders, null, 2)}

    **Overall Stats:**
    - Total Products (SKUs): ${products.length}
    - Total Completed Orders: ${completedOrders.length}
    - Total Revenue from all completed orders: ${completedOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)} ${baseCurrencyCode}
    
    Provide a concise business analysis in markdown format. Include:
    1.  An executive summary.
    2.  Key observations from the sales data.
    3.  Insights from the inventory data.
    4.  Actionable recommendations to improve sales or manage inventory.
    
    Be brief and to the point. The response should be formatted for clear presentation in a UI modal.
  `;

  try {
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting business analysis from Gemini:", error);
    throw new Error("Failed to get analysis from AI.");
  }
};

export const analyzeUserActivity = async (userName: string, auditLogs: AuditLog[]): Promise<string> => {
    // Fix: Implement user activity analysis using Gemini AI
    if (!process.env.API_KEY) {
        console.warn('API_KEY environment variable not set. Gemini AI features are disabled.');
        throw new Error('Gemini/Google AI is disabled in this deployment.');
    }

    const model = 'gemini-2.5-pro';

    const userLogs = auditLogs.filter(log => log.userName === userName).slice(0, 20); // Get latest 20 logs for this user

    if (userLogs.length === 0) {
        return `No activity logs found for user "${userName}".`;
    }

    const prompt = `
      Analyze the recent activity for the user "${userName}" based on their audit logs for a Point of Sale system.
      
      **Recent Audit Logs (up to 20 latest):**
      ${JSON.stringify(userLogs.map(log => ({ action: log.action, details: log.details, timestamp: log.timestamp })), null, 2)}
      
      Provide a concise summary of this user's activity. Highlight:
      - Common actions performed (e.g., product updates, sales, user management).
      - Any unusual or noteworthy activity (e.g., many deletions, frequent settings changes, after-hours activity).
      - The overall activity pattern (e.g., primarily sales-focused, administrative tasks, inventory management).
      
      Present the analysis as a plain text summary, using paragraphs and bullet points for readability.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing user activity with Gemini:", error);
        throw new Error("Failed to get analysis from AI.");
    }
};
