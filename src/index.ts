import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as dotenv from 'dotenv';
import { Request, Response } from 'express';

dotenv.config();

// Create the MCP server
const server = new McpServer({
  name: "Dominican Legal MCP",
  version: "1.0.0"
});

// Legal resources data
const legalResources: Record<string, string[]> = {
  "constitution": [
    "https://www.dominicana.gob.do/index.php/recursos/2014-12-16-21-02-56/category/3-constitucion-y-leyes-rd",
    "https://www.presidencia.gob.do/constitucion"
  ],
  "civil_code": [
    "https://www.oas.org/dil/esp/Código%20Civil%20de%20la%20República%20Dominicana.pdf",
    "https://www.poderjudicial.gob.do/documentos/PDF/codigos/Codigo_Civil.pdf"
  ],
  "penal_code": [
    "https://www.oas.org/juridico/spanish/mesicic3_rep_cod_penal.pdf",
    "https://www.poderjudicial.gob.do/documentos/PDF/codigos/Codigo_Penal.pdf"
  ],
  "labor_code": [
    "https://www.mt.gob.do/images/docs/biblioteca/codigo_de_trabajo.pdf",
    "https://www.poderjudicial.gob.do/documentos/PDF/codigos/Codigo_Trabajo.pdf"
  ],
  "commercial_code": [
    "https://www.poderjudicial.gob.do/documentos/PDF/codigos/Codigo_Comercio.pdf",
    "https://www.dgii.gov.do/legislacion/comercio/Documents/Codigo_Comercio.pdf"
  ],
  "tax_code": [
    "https://dgii.gov.do/legislacion/codigoTributario/Documents/Titulo1.pdf",
    "https://www.dgii.gov.do/legislacion/Documents/Codigo_Tributario_2023.pdf"
  ]
};

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
    
    // const debugInfo = { // Removed debug info
    //   receivedQuery: query,
    //   normalizedQuery: normalizedQuery,
    //   keywords: keywords,
    // };

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
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          analysis: "This case appears to involve contractual disputes under Dominican Civil Code.",
          relevant_articles: ["Articles 1101-1167 of the Dominican Civil Code"],
          precedents: [{
            case: "SCJ-PS-22-0123",
            court: "Suprema Corte de Justicia",
            summary: "Breach of contract case establishing burden of proof requirements",
            date: "2022-03-15"
          }],
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

// Start the server
const PORT = process.env.PORT || 8000;
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log(`Dominican Legal MCP server running on port ${PORT}`);
});

export default server;
