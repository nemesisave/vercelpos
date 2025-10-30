import { GoogleGenAI, Type, FunctionDeclaration, Part } from "@google/genai";
import type { Product, OrderItem, CompletedOrder, AuditLog, Permission } from '../types';
import { ALL_PERMISSIONS } from '../constants';

let ai: GoogleGenAI | null = null;

try {
  const apiKey = process.env.API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey: apiKey });
  } else {
    console.warn("API_KEY environment variable not set. Gemini AI features will be disabled.");
  }
} catch (e) {
  console.error("Failed to initialize GoogleGenAI. AI features will be disabled.", e);
}


// Helper to extract base price for AI context
const getBasePrice = (price: { [currencyCode: string]: number }, baseCurrencyCode: string) => {
    return price[baseCurrencyCode] || Object.values(price)[0] || 0;
};

export async function getAssistantResponse(
  prompt: string,
  products: Product[],
  order: OrderItem[],
  baseCurrencyCode: string
): Promise<string> {
  if (!ai) {
    return "I'm sorry, the AI assistant is not configured correctly. An API key is required.";
  }
  try {
    const systemInstruction = `You are a helpful POS assistant for a coffee shop. 
    Your knowledge base consists of the current product list (with stock levels and sale prices) and the current customer's order.
    The 'price' is the sale price for the customer. The 'purchasePrice' is internal cost information and should NOT be disclosed to the user.
    Answer questions based ONLY on the provided data. Be concise, friendly, and helpful.
    If asked about stock, refer to the 'stock' number. If a customer orders something, you can suggest a pastry that would go well with it.
    Do not make up information. Current Date: ${new Date().toLocaleDateString()}.
    All prices are in ${baseCurrencyCode}.`;
    
    // Simplify data for the AI, sending only the base price.
    const simplifiedProducts = products.map(p => ({ ...p, price: getBasePrice(p.price, baseCurrencyCode), purchasePrice: undefined }));
    const simplifiedOrder = order.map(o => ({ ...o, price: getBasePrice(o.price, baseCurrencyCode), purchasePrice: undefined }));

    const context = `
      ---
      AVAILABLE PRODUCTS:
      ${JSON.stringify(simplifiedProducts, null, 2)}
      ---
      CURRENT ORDER:
      ${JSON.stringify(simplifiedOrder, null, 2)}
      ---
      USER QUERY: "${prompt}"
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: context,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}


export async function getBusinessAnalysis(
  products: Product[],
  completedOrders: CompletedOrder[],
  baseCurrencyCode: string,
): Promise<string> {
  if (!ai) {
    return "AI analysis is unavailable. Please ensure the API key is configured correctly.";
  }
  try {
    const systemInstruction = `You are an expert business analyst for a coffee shop POS system. Your goal is to provide actionable insights based on sales and inventory data. Analyze the provided JSON data which contains a list of all products (with their current 'stock' and sale 'price') and a list of all completed orders. The currency for all financial data is ${baseCurrencyCode}.

Your analysis MUST be structured in the following format using Markdown:

**Sales & Inventory Analysis**

**1. Executive Summary:**
Provide a brief, 2-3 sentence overview of the business's performance.

**2. Top Performers:**
- List the top 3 best-selling products by quantity sold.
- Mention their total revenue generated.

**3. Underperformers:**
- List up to 3 products with low sales and high stock.
- Suggest a potential action, like a promotion or discount.

**4. Low Stock Alert & Predictive Analysis:**
- Identify products that are selling well but have low stock (e.g., less than 15 units).
- Based on recent sales trends, predict which products are at high risk of selling out in the next 7 days.
- Recommend reordering these items with suggested quantities.

**5. Actionable Recommendations:**
- Provide a bulleted list of 2-3 concrete, actionable recommendations based on your overall analysis.

Analyze the data thoroughly. Base all your conclusions strictly on the data provided. Be concise and professional. Do not disclose internal cost information like 'purchasePrice'. The 'price' is the sale price.`;

    // Simplify product data for AI analysis, using only base price.
    const simplifiedProducts = products.map(({ id, name, price, category, stock }) => ({ 
        id, name, price: getBasePrice(price, baseCurrencyCode), category, stock 
    }));
    
    // Completed orders are already in base currency, no need to simplify prices.

    const context = `
      ---
      AVAILABLE PRODUCTS (with current stock):
      ${JSON.stringify(simplifiedProducts, null, 2)}
      ---
      COMPLETED ORDERS:
      ${JSON.stringify(completedOrders, null, 2)}
      ---
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: context,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for business analysis:", error);
    return "I'm sorry, I was unable to complete the analysis. There might be an issue with the AI service. Please try again later.";
  }
}

export async function getRolePermissionSuggestions(roleName: string): Promise<Permission[]> {
  if (!ai) {
    console.warn("Cannot suggest permissions; AI is not configured.");
    return [];
  }
  try {
    const systemInstruction = `You are a system configuration assistant for a Point of Sale application.
Based on a user-provided role name, you must suggest a set of appropriate permissions from a predefined list.
Your response MUST be a valid JSON array of strings, containing only values from the provided permission list. Do not add any explanation or commentary.`;
    
    const prompt = `
      Given the role name "${roleName}", which of the following permissions are most appropriate?

      Available permissions:
      ${JSON.stringify(ALL_PERMISSIONS, null, 2)}

      Return only the JSON array of permission strings.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        }
    });

    const suggestedPermissions = JSON.parse(response.text);
    
    // Filter to ensure only valid permissions are returned
    return suggestedPermissions.filter((p: any) => ALL_PERMISSIONS.includes(p));

  } catch (error) {
    console.error("Error calling Gemini API for permission suggestions:", error);
    return [];
  }
}

export async function analyzeUserActivity(userName: string, userLogs: AuditLog[]): Promise<string> {
    if (!ai) {
        return "User activity analysis is unavailable. Please ensure the API key is configured correctly.";
    }
    try {
        const systemInstruction = `You are a security and performance auditor for a Point of Sale system.
Your task is to analyze a user's activity log and provide a concise, insightful summary in Markdown format.
Focus on identifying potential security risks, performance issues, or unusual patterns.

Your analysis must follow this structure:

**Activity Analysis for ${userName}**

**1. Summary:**
Provide a brief 2-3 sentence overview of the user's main activities.

**2. Key Observations:**
- Mention the user's most common actions.
- Note the typical times of activity.

**3. Potential Anomalies & Insights:**
- **Crucially, point out anything suspicious.** Examples: a high number of refunds, voided sales, discounts, inventory changes outside of business hours, or rapid sequences of sensitive actions.
- If there are no anomalies, state that the activity appears normal.
- Provide one or two actionable insights if applicable (e.g., "Frequent price changes on item X might warrant a review.").

Be professional, objective, and base your analysis strictly on the provided log data.
`;

        const context = `
            Please analyze the following activity log for user "${userName}":
            ---
            LOG DATA:
            ${JSON.stringify(userLogs, null, 2)}
            ---
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: context,
            config: {
                systemInstruction,
                temperature: 0.2
            }
        });

        return response.text;

    } catch (error) {
        console.error("Error calling Gemini API for user activity analysis:", error);
        return "I'm sorry, I was unable to complete the user activity analysis. The AI service might be unavailable.";
    }
}

// New function for upselling suggestions
export async function getUpsellSuggestion(
  orderItems: OrderItem[],
  products: Product[],
  baseCurrencyCode: string
): Promise<string | null> {
  if (!ai || orderItems.length === 0) {
    return null;
  }

  try {
    const systemInstruction = `You are a coffee shop sales assistant. Based on the current order, suggest ONE complementary item from the available product list. 
    The goal is upselling. For example, if they order coffee, suggest a pastry. If they order a muffin, suggest a coffee.
    Consider what is in stock.
    Respond with ONLY the name of the suggested product. Do not add any other words, explanations, or punctuation.`;

    const simplifiedProducts = products
      .filter(p => p.stock > 0 && !orderItems.some(item => item.id === p.id)) // Filter for in-stock, not-in-order items
      .map(p => ({ id: p.id, name: p.name, category: p.category, price: getBasePrice(p.price, baseCurrencyCode) }));
      
    const simplifiedOrder = orderItems.map(o => ({ name: o.name, category: o.category }));

    if (simplifiedProducts.length === 0) return null; // No items to suggest

    const prompt = `
      CURRENT ORDER:
      ${JSON.stringify(simplifiedOrder)}

      AVAILABLE PRODUCTS:
      ${JSON.stringify(simplifiedProducts)}
      
      Based on the order, what is the best single product to suggest?
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { systemInstruction, temperature: 0.8 }
    });

    const suggestion = response.text.trim();

    // Verify the suggestion is a real product
    if (products.some(p => p.name.toLowerCase() === suggestion.toLowerCase())) {
        return suggestion;
    }

    return null;
  } catch (error) {
    console.error("Error getting upsell suggestion:", error);
    return null;
  }
}

// New function to parse voice commands using Function Calling
const addToOrderFunctionDeclaration: FunctionDeclaration = {
  name: 'addToOrder',
  description: 'Adds one or more products to the current point of sale order.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        description: 'A list of items to add to the order.',
        items: {
          type: Type.OBJECT,
          properties: {
            productName: {
              type: Type.STRING,
              description: 'The name of the product to add. Must be an exact match from the provided product list.',
            },
            quantity: {
              type: Type.INTEGER,
              description: 'The number of units of the product to add. Defaults to 1 if not specified.',
            },
          },
          required: ['productName'],
        },
      },
    },
    required: ['items'],
  },
};

export async function parseVoiceCommand(
    command: string,
    products: Product[]
): Promise<{ productName: string; quantity: number }[] | null> {
    if (!ai) {
        console.warn("Cannot parse voice command; AI is not configured.");
        return null;
    }

    try {
        const systemInstruction = `You are a voice command parser for a Point of Sale system.
Your task is to interpret a spoken command from a user and translate it into a structured function call to add items to an order.
You must use the provided "addToOrder" function.
Match the spoken product names to the closest available product from the list. For example, "lattes" should match "Latte".
Handle quantities, like "two cappuccinos" or "a cookie". If no quantity is mentioned, assume 1.`;

        const productNames = products.map(p => p.name);

        const prompt = `
            Available products: ${productNames.join(', ')}
            
            User command: "${command}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: [addToOrderFunctionDeclaration] }],
            },
        });
        
        const functionCall = response.functionCalls?.[0];

        if (functionCall && functionCall.name === 'addToOrder' && functionCall.args.items) {
          // Normalize the result to ensure quantity is a number
          return functionCall.args.items.map((item: any) => ({
              productName: item.productName,
              quantity: Number(item.quantity || 1)
          }));
        }

        return null;
    } catch (error) {
        console.error("Error parsing voice command:", error);
        return null;
    }
}