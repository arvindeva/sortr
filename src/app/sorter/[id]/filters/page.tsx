"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Filter, Play } from "lucide-react";
import Link from "next/link";

interface FilterPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface Group {
  id: string;
  name: string;
  items: {
    id: string;
    title: string;
    imageUrl?: string;
  }[];
}

interface Sorter {
  id: string;
  title: string;
  description?: string;
  useGroups: boolean;
}

interface ApiResponse {
  sorter: Sorter;
  groups: Group[];
  items: any[];
}

export default function FilterPage({ params }: FilterPageProps) {
  const router = useRouter();
  const [sorter, setSorter] = useState<Sorter | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/sorters/${id}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch sorter data");
        }

        const data: ApiResponse = await response.json();
        
        if (!data.sorter.useGroups) {
          // Redirect to sort page if not using groups
          router.push(`/sorter/${id}/sort`);
          return;
        }

        setSorter(data.sorter);
        setGroups(data.groups);
        
        // Select all groups by default
        setSelectedGroups(data.groups.map(group => group.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleStartSorting = () => {
    if (selectedGroups.length === 0) {
      alert("Please select at least one group to sort");
      return;
    }

    // Store selected groups in localStorage for the sort page
    localStorage.setItem(`sorter_${sorter?.id}_selectedGroups`, JSON.stringify(selectedGroups));
    
    router.push(`/sorter/${sorter?.id}/sort`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading filters...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!sorter) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Sorter not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const totalItems = selectedGroups.reduce((total, groupId) => {
    const group = groups.find(g => g.id === groupId);
    return total + (group?.items.length || 0);
  }, 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/sorter/${sorter.id}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Sorter
            </Button>
          </Link>
        </div>
        
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Select Groups to Sort</h1>
          <p className="text-muted-foreground">
            Choose which groups you want to include in your sorting session for "{sorter.title}"
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            <span>{selectedGroups.length} of {groups.length} groups selected</span>
          </div>
          <div>
            <span>{totalItems} items total</span>
          </div>
        </div>
      </div>

      {/* Groups Selection */}
      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => {
            const isSelected = selectedGroups.includes(group.id);
            
            return (
              <div
                key={group.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <Badge variant={isSelected ? "default" : "secondary"}>
                    {group.items.length} items
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {group.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.imageUrl ? (
                        <div className="h-6 w-6 bg-muted rounded overflow-hidden flex-shrink-0">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-6 w-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">
                            {item.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-muted-foreground truncate">{item.title}</span>
                    </div>
                  ))}
                  
                  {group.items.length > 3 && (
                    <div className="text-xs text-muted-foreground ml-8">
                      +{group.items.length - 3} more items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleStartSorting}
          disabled={selectedGroups.length === 0}
          size="lg"
          className="flex-1 max-w-md"
        >
          <Play className="h-4 w-4 mr-2" />
          Start Sorting ({totalItems} items)
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedGroups(groups.map(g => g.id))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedGroups([])}
          >
            Clear All
          </Button>
        </div>
      </div>

      {selectedGroups.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            Please select at least one group to start sorting.
          </p>
        </div>
      )}
    </div>
  );
}