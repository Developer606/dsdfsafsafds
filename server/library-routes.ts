import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { fromZodError } from "zod-validation-error";
import { authenticateJWT } from "./middleware/jwt-auth";
import { isAdmin } from "./auth";
import {
  insertMangaSchema,
  insertBookSchema,
  insertNewsSchema
} from "@shared/schema";

const router = Router();

// Apply authentication middleware for protected routes
router.use(authenticateJWT);

/**
 * MANGA ROUTES
 */
// Get all manga items
router.get("/manga", async (req, res) => {
  try {
    const mangaItems = await storage.getAllMangaItems();
    res.json(mangaItems);
  } catch (error) {
    console.error("Error fetching manga items:", error);
    res.status(500).json({ error: "Failed to fetch manga items" });
  }
});

// Search manga items
router.get("/manga/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    
    const results = await storage.searchMangaItems(query);
    res.json(results);
  } catch (error) {
    console.error(`Error searching manga items with query ${req.params.query}:`, error);
    res.status(500).json({ error: "Failed to search manga items" });
  }
});

// Get manga item by ID
router.get("/manga/:id", async (req, res) => {
  try {
    const mangaItem = await storage.getMangaItemById(req.params.id);
    if (!mangaItem) {
      return res.status(404).json({ error: "Manga item not found" });
    }
    res.json(mangaItem);
  } catch (error) {
    console.error(`Error fetching manga item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch manga item" });
  }
});

// Create manga item (admin only)
router.post("/manga", isAdmin, async (req, res) => {
  try {
    const mangaData = insertMangaSchema.parse(req.body);
    const newManga = await storage.createMangaItem(mangaData);
    res.status(201).json(newManga);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error("Error creating manga item:", error);
    res.status(500).json({ error: "Failed to create manga item" });
  }
});

// Update manga item (admin only)
router.put("/manga/:id", isAdmin, async (req, res) => {
  try {
    const mangaItem = await storage.getMangaItemById(req.params.id);
    if (!mangaItem) {
      return res.status(404).json({ error: "Manga item not found" });
    }
    
    const updateData = insertMangaSchema.partial().parse(req.body);
    const updatedManga = await storage.updateMangaItem(req.params.id, updateData);
    res.json(updatedManga);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error(`Error updating manga item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update manga item" });
  }
});

// Delete manga item (admin only)
router.delete("/manga/:id", isAdmin, async (req, res) => {
  try {
    const mangaItem = await storage.getMangaItemById(req.params.id);
    if (!mangaItem) {
      return res.status(404).json({ error: "Manga item not found" });
    }
    
    await storage.deleteMangaItem(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error(`Error deleting manga item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete manga item" });
  }
});

/**
 * BOOK ROUTES
 */
// Get all book items
router.get("/books", async (req, res) => {
  try {
    const bookItems = await storage.getAllBookItems();
    res.json(bookItems);
  } catch (error) {
    console.error("Error fetching book items:", error);
    res.status(500).json({ error: "Failed to fetch book items" });
  }
});

// Get book item by ID
router.get("/books/:id", async (req, res) => {
  try {
    const bookItem = await storage.getBookItemById(req.params.id);
    if (!bookItem) {
      return res.status(404).json({ error: "Book item not found" });
    }
    res.json(bookItem);
  } catch (error) {
    console.error(`Error fetching book item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch book item" });
  }
});

// Search book items
router.get("/books/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    
    const results = await storage.searchBookItems(query);
    res.json(results);
  } catch (error) {
    console.error(`Error searching book items with query ${req.params.query}:`, error);
    res.status(500).json({ error: "Failed to search book items" });
  }
});

// Create book item (admin only)
router.post("/books", isAdmin, async (req, res) => {
  try {
    const bookData = insertBookSchema.parse(req.body);
    const newBook = await storage.createBookItem(bookData);
    res.status(201).json(newBook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error("Error creating book item:", error);
    res.status(500).json({ error: "Failed to create book item" });
  }
});

// Update book item (admin only)
router.put("/books/:id", isAdmin, async (req, res) => {
  try {
    const bookItem = await storage.getBookItemById(req.params.id);
    if (!bookItem) {
      return res.status(404).json({ error: "Book item not found" });
    }
    
    const updateData = insertBookSchema.partial().parse(req.body);
    const updatedBook = await storage.updateBookItem(req.params.id, updateData);
    res.json(updatedBook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error(`Error updating book item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update book item" });
  }
});

// Delete book item (admin only)
router.delete("/books/:id", isAdmin, async (req, res) => {
  try {
    const bookItem = await storage.getBookItemById(req.params.id);
    if (!bookItem) {
      return res.status(404).json({ error: "Book item not found" });
    }
    
    await storage.deleteBookItem(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error(`Error deleting book item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete book item" });
  }
});

/**
 * NEWS ROUTES
 */
// Get all news items
router.get("/news", async (req, res) => {
  try {
    const newsItems = await storage.getAllNewsItems();
    res.json(newsItems);
  } catch (error) {
    console.error("Error fetching news items:", error);
    res.status(500).json({ error: "Failed to fetch news items" });
  }
});

// Get news item by ID
router.get("/news/:id", async (req, res) => {
  try {
    const newsItem = await storage.getNewsItemById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "News item not found" });
    }
    res.json(newsItem);
  } catch (error) {
    console.error(`Error fetching news item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch news item" });
  }
});

// Search news items
router.get("/news/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    
    const results = await storage.searchNewsItems(query);
    res.json(results);
  } catch (error) {
    console.error(`Error searching news items with query ${req.params.query}:`, error);
    res.status(500).json({ error: "Failed to search news items" });
  }
});

// Create news item (admin only)
router.post("/news", isAdmin, async (req, res) => {
  try {
    const newsData = insertNewsSchema.parse(req.body);
    const newNews = await storage.createNewsItem(newsData);
    res.status(201).json(newNews);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error("Error creating news item:", error);
    res.status(500).json({ error: "Failed to create news item" });
  }
});

// Update news item (admin only)
router.put("/news/:id", isAdmin, async (req, res) => {
  try {
    const newsItem = await storage.getNewsItemById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "News item not found" });
    }
    
    const updateData = insertNewsSchema.partial().parse(req.body);
    const updatedNews = await storage.updateNewsItem(req.params.id, updateData);
    res.json(updatedNews);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromZodError(error);
      return res.status(400).json({ error: validationError.message });
    }
    console.error(`Error updating news item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update news item" });
  }
});

// Delete news item (admin only)
router.delete("/news/:id", isAdmin, async (req, res) => {
  try {
    const newsItem = await storage.getNewsItemById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "News item not found" });
    }
    
    await storage.deleteNewsItem(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error(`Error deleting news item with ID ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete news item" });
  }
});

export default router;