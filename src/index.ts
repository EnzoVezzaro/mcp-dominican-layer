import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from 'dotenv';
import { legalResources, legalArticles, legalPrecedents } from "./legal-resources.js";

dotenv.config();

// Create the MCP server
const server = new McpServer({
  name: "Dominican Legal MCP",
  version: "1.0.0"
});

// Register legal research tool
server.tool("dominican-legal-research", 
  { query: z.string() },
  async ({ query }) => {
    // console.error(`[DEBUG] Received query: ${query}`); // Removed log
    const normalizedQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize and remove accents
    // console.error(`[DEBUG] Normalized query: ${normalizedQuery}`); // Removed log
    const keywords = normalizedQuery.split(/\s+/);
    const results: Array<{title: string, urls: string[], relevance: string}> = []; // Changed url to urls: string[]
    
    for (const keyword of keywords) {
      const isConstitution = keyword.includes("constitucion") || keyword.includes("constitucional");
      // console.error(`[DEBUG] Is constitution keyword? ${isConstitution}`); // Removed log
      if (isConstitution) { // Check against normalized keyword
        results.push({
          title: "Constitución de la República Dominicana",
          urls: legalResources["constitution"], // Changed url to urls
          relevance: "high"
        });
      } else if (keyword.includes("civil")) {
        results.push({
          title: "Código Civil Dominicano",
          urls: legalResources["civil_code"], // Changed url to urls
          relevance: "high"
        });
      } else if (keyword.includes("penal") || keyword.includes("criminal")) {
        results.push({
          title: "Código Penal Dominicano",
          urls: legalResources["penal_code"], // Changed url to urls
          relevance: "high"
        });
      } else if (keyword.includes("laboral") || keyword.includes("trabajo")) {
        results.push({
          title: "Código de Trabajo de la República Dominicana",
          urls: legalResources["labor_code"], // Changed url to urls
          relevance: "high"
        });
      } else if (keyword.includes("comercio") || keyword.includes("comercial")) {
        results.push({
          title: "Código de Comercio",
          urls: legalResources["commercial_code"], // Changed url to urls
          relevance: "high"
        });
      } else if (keyword.includes("tributario") || keyword.includes("impuesto")) {
        results.push({
          title: "Código Tributario",
          urls: legalResources["tax_code"], // Changed url to urls
          relevance: "high"
        });
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ results, query, timestamp: new Date().toISOString() /* Removed debug */ }, null, 2)
      }]
    };
  }
);

// Register case analysis tool
server.tool("legal-case-analysis",
  { caseDetails: z.string() },
  async ({ caseDetails }) => {
    const details = caseDetails.toLowerCase();
    const isContract = details.includes("contract") || details.includes("obligation");
    const isProperty = details.includes("property") || details.includes("real estate");
    const isPrivacy = details.includes("privacy") || details.includes("data");
    const isExpression = details.includes("expression") || details.includes("speech");

    let relevantArticles: Array<{number: string, url: string}> = [];
    let relevantPrecedents: Array<{
      case: string;
      title: string;
      url: string;
      summary: string;
      year?: number;
    }> = [];
    let analysis = "General legal analysis";

    if (isContract) {
      relevantArticles = Object.entries(legalArticles.civil_code)
        .filter(([num]) => ['1101','1183','1219'].includes(num))
        .map(([number, url]) => ({ number, url }));
      relevantPrecedents = legalPrecedents.supreme_court
        .filter(p => p.title.includes("Contract"));
      analysis = "Contractual dispute under Dominican Civil Code";
    } 
    else if (isProperty) {
      relevantArticles = Object.entries(legalArticles.civil_code)
        .filter(([num]) => ['1382','1467'].includes(num))
        .map(([number, url]) => ({ number, url }));
      relevantPrecedents = legalPrecedents.supreme_court
        .filter(p => p.title.includes("Property"));
      analysis = "Property rights case under Dominican Civil Code";
    }
    else if (isPrivacy) {
      relevantArticles = Object.entries(legalArticles.constitution)
        .filter(([num]) => ['37','44'].includes(num))
        .map(([number, url]) => ({ number, url }));
      relevantPrecedents = legalPrecedents.constitutional_court
        .filter(p => p.title.includes("Privacy"));
      analysis = "Privacy rights case under Dominican Constitution";
    }
    else if (isExpression) {
      relevantArticles = Object.entries(legalArticles.constitution)
        .filter(([num]) => ['49','55'].includes(num))
        .map(([number, url]) => ({ number, url }));
      relevantPrecedents = legalPrecedents.constitutional_court
        .filter(p => p.title.includes("Expression"));
      analysis = "Freedom of expression case under Dominican Constitution";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          analysis,
          relevantArticles,
          relevantPrecedents,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
);

// Register document generation tool
server.tool("legal-document-generator",
  { 
    documentType: z.enum(["demand", "contract"]),
    details: z.record(z.unknown())
  },
  async ({ documentType, details }) => {
    const templates: Record<"demand" | "contract", string> = {
      "demand": `...`, // Template content here
      "contract": `...` // Template content here
    };
    
    const template = templates[documentType] || "Template not available";
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          document_type: documentType,
          template,
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
);

// Register document search tool
server.tool("legal-document-search-extract",
  { 
    searchTerm: z.string().min(1)
  },
  async ({ searchTerm }) => {
    const normalizedQuery = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = normalizedQuery.split(/\s+/);
    const results: Array<{resourceType: string, urls: string[]}> = [];
    
    for (const keyword of keywords) {
      if (keyword.includes("constitucion") || keyword.includes("constitucional")) {
        results.push({
          resourceType: "constitution",
          urls: legalResources["constitution"]
        });
      } 
      if (keyword.includes("civil")) {
        results.push({
          resourceType: "civil_code",
          urls: legalResources["civil_code"]
        });
      }
      if (keyword.includes("penal") || keyword.includes("criminal")) {
        results.push({
          resourceType: "penal_code", 
          urls: legalResources["penal_code"]
        });
      }
      if (keyword.includes("laboral") || keyword.includes("trabajo")) {
        results.push({
          resourceType: "labor_code",
          urls: legalResources["labor_code"]
        });
      }
      if (keyword.includes("comercio") || keyword.includes("comercial")) {
        results.push({
          resourceType: "commercial_code",
          urls: legalResources["commercial_code"]
        });
      }
      if (keyword.includes("tributario") || keyword.includes("impuesto")) {
        results.push({
          resourceType: "tax_code",
          urls: legalResources["tax_code"]
        });
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          searchTerm,
          results,
          instruction: "Please analyze these legal documents and extract relevant information matching the search term",
          timestamp: new Date().toISOString()
        }, null, 2)
      }]
    };
  }
);

// Start the server
const PORT = process.env.PORT || 8000;
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log(`Dominican Legal MCP server running on port ${PORT}`);
});

export default server;
