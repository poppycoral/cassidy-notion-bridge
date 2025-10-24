 const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const NOTION_TOKEN = process.env.NOTION_TOKEN; // Your integration token
const MCP_ENDPOINT = 'https://mcp.notion.com/mcp';

// Store session information
const sessions = new Map();

// Initialize MCP session
async function initializeSession() {
  const sessionId = crypto.randomUUID();
  
  try {
    const response = await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'cassidy-mcp-bridge',
          version: '1.0.0'
        }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2025-06-18',
        'Notion-Version': '2022-06-28'
      }
    });

    const mcpSessionId = response.headers['mcp-session-id'];
    sessions.set(sessionId, {
      mcpSessionId,
      capabilities: response.data.result.capabilities,
      createdAt: Date.now()
    });

    // Send initialized notification
    await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Session-Id': mcpSessionId,
        'Notion-Version': '2022-06-28'
      }
    });

    return sessionId;
  } catch (error) {
    console.error('Failed to initialize session:', error.response?.data || error.message);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

// Create a new session
app.post('/session', async (req, res) => {
  try {
    const sessionId = await initializeSession();
    res.json({ sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// List available tools
app.get('/tools', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid or missing session' });
  }

  const session = sessions.get(sessionId);

  try {
    const response = await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list'
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Session-Id': session.mcpSessionId,
        'Notion-Version': '2022-06-28'
      }
    });

    res.json(response.data.result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Execute a tool
app.post('/execute', async (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { tool, arguments: args } = req.body;

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Invalid or missing session' });
  }

  const session = sessions.get(sessionId);

  try {
    const response = await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: tool,
        arguments: args
      }
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Session-Id': session.mcpSessionId,
        'Notion-Version': '2022-06-28'
      }
    });

    res.json(response.data.result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Simplified endpoints for common actions
app.post('/notion/search', async (req, res) => {
  const sessionId = req.headers['x-session-id'] || await initializeSession();
  const session = sessions.get(sessionId);
  const { query } = req.body;

  try {
    const response = await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'search',
        arguments: { query }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Session-Id': session.mcpSessionId,
        'Notion-Version': '2022-06-28'
      }
    });

    res.json({ sessionId, result: response.data.result });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post('/notion/create-page', async (req, res) => {
  const sessionId = req.headers['x-session-id'] || await initializeSession();
  const session = sessions.get(sessionId);
  const { parent, title, content } = req.body;

  try {
    const response = await axios.post(MCP_ENDPOINT, {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'create_page',
        arguments: { parent, title, content }
      }
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'MCP-Session-Id': session.mcpSessionId,
        'Notion-Version': '2022-06-28'
      }
    });

    res.json({ sessionId, result: response.data.result });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`MCP Bridge server running on port ${PORT}`);
});
