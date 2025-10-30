import { GoogleGenAI, Type } from '@google/genai';
import type { Permission, Product, CompletedOrder, AuditLog } from '../types';
import { ALL_PERMISSIONS } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Suggests a set of permissions for a given role name using Gemini.
 */
export const getRolePermissionSuggestions = async (roleName: string): Promise<Permission[]> => {
    const prompt = `
        Based on the role title "${roleName}", which of the following permissions are most appropriate for a point-of-sale system?
        Return your response as a JSON array of strings, containing only the relevant permission keys from the list provided.
        Do not include any explanation or surrounding text.

        Available permissions:
        ${ALL_PERMISSIONS.join(', ')}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });

        const jsonString = response.text;
        const suggestedPermissions = JSON.parse(jsonString);

        if (Array.isArray(suggestedPermissions)) {
            // Filter to ensure only valid permissions are returned
            return suggestedPermissions.filter((p: any): p is Permission => 
                typeof p === 'string' && ALL_PERMISSIONS.includes(p as Permission)
            );
        }
        return [];
    } catch (e) {
        console.error("Error getting role permission suggestions from Gemini:", e);
        // Return empty array for graceful failure
        return [];
    }
};


/**
 * Generates a business performance analysis using Gemini.
 */
export const getBusinessAnalysis = async (products: Product[], completedOrders: CompletedOrder[], baseCurrencyCode: string): Promise<string> => {
    // Simplified data for the prompt to keep it concise and within token limits
    const salesData = completedOrders.slice(0, 50).map(o => ({
        total: o.total,
        itemCount: o.items.length,
        date: o.date,
        items: o.items.map(i => ({ name: i.name, quantity: i.quantity, category: i.category, price: i.price[baseCurrencyCode] }))
    }));

    const productData = products.slice(0, 50).map(p => ({
        name: p.name,
        stock: p.stock,
        category: p.category,
        price: p.price[baseCurrencyCode],
        purchasePrice: p.purchasePrice[baseCurrencyCode]
    }));

    const prompt = `
        **Analyze the following Point of Sale data and provide a concise business performance analysis.**

        The data is for a business with the base currency ${baseCurrencyCode}.

        **Sales Data (${salesData.length} recent orders):**
        ${JSON.stringify(salesData, null, 2)}

        **Product Inventory Data (${productData.length} products):**
        ${JSON.stringify(productData, null, 2)}

        **Your analysis should include:**
        1.  **Executive Summary:** A brief overview of sales performance.
        2.  **Top Performers:** Identify best-selling products or categories based on revenue and quantity.
        3.  **Potential Issues:** Point out any potential issues like low-selling items, low stock on popular items, or items with low-profit margins.
        4.  **Actionable Recommendations:** Suggest 2-3 concrete actions the business owner could take to improve sales or profitability (e.g., "Consider a promotion on 'Cappuccino' which sells well," or "Restock 'Croissant' as it is a top seller with low inventory").

        **Format your response using Markdown with the following structure:**
        **Sales & Inventory Analysis**
        
        **1. Executive Summary:**
        - Your summary here.

        **2. Top Performers & Insights:**
        - Your insights here.

        **3. Potential Issues & Opportunities:**
        - Your issues here.

        **4. Actionable Recommendations:**
        - Recommendation 1.
        - Recommendation 2.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using pro for more complex analysis
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error getting business analysis from Gemini:", error);
        throw error; // Let the caller handle the UI display of the error
    }
};


/**
 * Analyzes a user's activity based on audit logs using Gemini.
 */
export const analyzeUserActivity = async (userName: string, auditLogs: AuditLog[]): Promise<string> => {
    // Use a summary of logs to stay within token limits
    const logSummary = auditLogs.slice(0, 50).map(log => ({
        action: log.action,
        details: log.details.substring(0, 100), // Truncate details
        timestamp: log.timestamp
    }));

    const prompt = `
        Analyze the recent activity for the user "${userName}" based on the following audit logs from a Point of Sale system.
        Provide a concise, human-readable summary of their key activities.
        
        Focus on:
        - Patterns of activity (e.g., frequent product updates, many sales processed, cash drawer management).
        - Any unusual or noteworthy actions (e.g., multiple refunds, settings changes, user deactivations).
        - The user's likely primary role based on their actions (e.g., cashier, inventory manager, administrator).

        Do not simply list the logs. Synthesize the information into a summary.
        If there are no logs, state that the user has no recent activity.

        Logs (${logSummary.length} recent entries):
        ${JSON.stringify(logSummary, null, 2)}

        Provide the analysis as a plain text summary, in 3-4 short paragraphs.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        return response.text;
    } catch (error) {
        console.error(`Error analyzing activity for user ${userName}:`, error);
        throw error; // Let the caller handle the UI display of the error
    }
};
