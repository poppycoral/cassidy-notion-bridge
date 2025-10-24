const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_API = 'https://api.notion.com/v1';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Search Notion
app.post('/notion/search', async (req, res) => {
  const { query } = req.body;

  try {
    const response = await axios.post(`${NOTION_API}/search`, {
      query: query,
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      results: response.data.results 
    });
  } catch (error) {
    console.error('Search error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Create a page
app.post('/notion/create-page', async (req, res) => {
  const { parent, title, content } = req.body;

  try {
    const response = await axios.post(`${NOTION_API}/pages`, {
      parent: { page_id: parent },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: content ? [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: content } }]
        }
      }] : []
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      page: response.data 
    });
  } catch (error) {
    console.error('Create page error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Update page properties
app.post('/notion/update-page', async (req, res) => {
  const { page_id, properties } = req.body;

  try {
    const response = await axios.patch(`${NOTION_API}/pages/${page_id}`, {
      properties: properties
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      page: response.data 
    });
  } catch (error) {
    console.error('Update page error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Get page content
app.post('/notion/get-page', async (req, res) => {
  const { page_id } = req.body;

  try {
    const response = await axios.get(`${NOTION_API}/pages/${page_id}`, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28'
      }
    });

    res.json({ 
      success: true,
      page: response.data 
    });
  } catch (error) {
    console.error('Get page error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Query database
app.post('/notion/query-database', async (req, res) => {
  const { database_id, filter, sorts } = req.body;

  try {
    const response = await axios.post(`${NOTION_API}/databases/${database_id}/query`, {
      filter: filter || {},
      sorts: sorts || []
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      results: response.data.results 
    });
  } catch (error) {
    console.error('Query database error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Create database item
app.post('/notion/create-database-item', async (req, res) => {
  const { database_id, properties } = req.body;

  try {
    const response = await axios.post(`${NOTION_API}/pages`, {
      parent: { database_id: database_id },
      properties: properties
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      page: response.data 
    });
  } catch (error) {
    console.error('Create database item error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

// Append content to page
app.post('/notion/append-content', async (req, res) => {
  const { page_id, content } = req.body;

  try {
    const response = await axios.patch(`${NOTION_API}/blocks/${page_id}/children`, {
      children: [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: content } }]
        }
      }]
    }, {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      result: response.data 
    });
  } catch (error) {
    console.error('Append content error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Notion API Bridge server running on port ${PORT}`);
});
