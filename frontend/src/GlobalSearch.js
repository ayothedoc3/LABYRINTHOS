import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import {
  Search, FileText, BookOpen, ScrollText, Briefcase, 
  Workflow, X, Loader2, ArrowRight, Sparkles, Clock
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Category configs
const CATEGORIES = {
  workflows: { icon: Workflow, color: "bg-purple-100 text-purple-700", label: "Workflow" },
  sops: { icon: ScrollText, color: "bg-blue-100 text-blue-700", label: "SOP" },
  playbooks: { icon: BookOpen, color: "bg-green-100 text-green-700", label: "Playbook" },
  templates: { icon: FileText, color: "bg-orange-100 text-orange-700", label: "Template" },
  contracts: { icon: Briefcase, color: "bg-pink-100 text-pink-700", label: "Contract" },
};

const GlobalSearch = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("labyrinth_recent_searches");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({});
      return;
    }

    setLoading(true);
    try {
      const [workflowsRes, sopsRes, playbooksRes, templatesRes, contractsRes] = await Promise.all([
        axios.get(`${API}/workflowviz/workflows`),
        axios.get(`${API}/sops`),
        axios.get(`${API}/playbooks`),
        axios.get(`${API}/builder/templates`),
        axios.get(`${API}/contracts`),
      ]);

      const q = searchQuery.toLowerCase();
      
      const filterItems = (items, fields) => {
        return items.filter(item => 
          fields.some(field => {
            const value = item[field];
            return value && String(value).toLowerCase().includes(q);
          })
        ).slice(0, 5);
      };

      setResults({
        workflows: filterItems(workflowsRes.data, ["name", "description"]),
        sops: filterItems(sopsRes.data, ["name", "sop_id", "description", "function"]),
        playbooks: filterItems(playbooksRes.data, ["name", "playbook_id", "description", "function"]),
        templates: filterItems(templatesRes.data, ["name", "description", "template_type"]),
        contracts: filterItems(contractsRes.data, ["name", "title", "client_name", "description"]),
      });
    } catch (error) {
      console.error("Search error:", error);
    }
    setLoading(false);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle selecting a result
  const handleSelect = (category, item) => {
    // Save to recent searches
    const searchEntry = {
      query,
      category,
      item: { id: item.id, name: item.name || item.title },
      timestamp: new Date().toISOString()
    };
    const newRecent = [searchEntry, ...recentSearches.filter(r => r.item.id !== item.id)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("labyrinth_recent_searches", JSON.stringify(newRecent));

    // Navigate based on category
    if (onNavigate) {
      onNavigate(category, item);
    }
    
    setOpen(false);
    setQuery("");
  };

  // Count total results
  const totalResults = Object.values(results).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative w-full max-w-sm justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Search workflows, SOPs, templates...</span>
        <span className="sm:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Global Search
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Search workflows, SOPs, playbooks, templates, contracts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Results */}
          <ScrollArea className="max-h-[400px]">
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : query.length < 2 ? (
                /* Recent Searches */
                <div>
                  {recentSearches.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Recent Searches
                      </p>
                      <div className="space-y-1">
                        {recentSearches.map((recent, idx) => {
                          const cat = CATEGORIES[recent.category];
                          const Icon = cat?.icon || FileText;
                          return (
                            <button
                              key={idx}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                              onClick={() => handleSelect(recent.category, recent.item)}
                            >
                              <div className={`p-1.5 rounded ${cat?.color || "bg-gray-100"}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{recent.item.name}</p>
                                <p className="text-xs text-muted-foreground">{cat?.label}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {recentSearches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Start typing to search</p>
                      <p className="text-xs mt-1">Search across workflows, SOPs, playbooks, templates & contracts</p>
                    </div>
                  )}
                </div>
              ) : totalResults === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found for &quot;{query}&quot;</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(results).map(([category, items]) => {
                    if (!items || items.length === 0) return null;
                    const cat = CATEGORIES[category];
                    const Icon = cat?.icon || FileText;
                    
                    return (
                      <div key={category}>
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {cat?.label}s ({items.length})
                        </p>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <button
                              key={item.id || item.sop_id || item.playbook_id}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                              onClick={() => handleSelect(category, item)}
                            >
                              <div className={`p-1.5 rounded ${cat?.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {item.name || item.title || item.client_name || "Unnamed"}
                                  </p>
                                  {item.ai_generated && (
                                    <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {(item.sop_id || item.playbook_id) && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                                      {item.sop_id || item.playbook_id}
                                    </Badge>
                                  )}
                                  {item.function && (
                                    <span className="text-xs text-muted-foreground">{item.function}</span>
                                  )}
                                  {item.description && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {item.description.slice(0, 50)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <Separator />
          <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
