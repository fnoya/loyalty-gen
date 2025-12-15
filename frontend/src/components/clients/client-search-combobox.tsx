"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/api";
import type { Client } from "@/types/client";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientSearchComboboxProps {
  value?: string;
  onSelect: (clientId: string, client: Client) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function ClientSearchCombobox({
  value,
  onSelect,
  excludeIds = [],
  placeholder = "Buscar cliente...",
}: ClientSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Debounced search
  useEffect(() => {
    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      setClients([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      if (!isMounted) return;

      try {
        // Fetch all clients and filter client-side
        // API limit constraint: must be between 1 and 100

        const response = await apiRequest<{
          data: Client[];
          paging: { nextCursor?: string };
        }>("/clients?limit=100");

        if (!isMounted) {
          return;
        }

        // Safe extraction of clients array - handle both direct array and nested structure
        let allClients: Client[] = [];
        if (response && typeof response === "object") {
          if ("data" in response && Array.isArray(response.data)) {
            allClients = response.data;
          } else if (Array.isArray(response)) {
            allClients = response;
          }
        }

        const searchLower = trimmedSearch.toLowerCase();
        const filtered = allClients.filter((client) => {
          // Exclude specified IDs
          if (excludeIds.includes(client.id)) return false;

          const firstName = (client.name?.firstName || "").toLowerCase();
          const lastName = (client.name?.firstLastName || "").toLowerCase();
          const fullName = `${firstName} ${lastName}`;
          const email = (client.email || "").toLowerCase();
          const documentNumber = (
            client.identity_document?.number || ""
          ).toLowerCase();

          // Match if search term appears in any field
          return (
            firstName.includes(searchLower) ||
            lastName.includes(searchLower) ||
            fullName.includes(searchLower) ||
            email.includes(searchLower) ||
            documentNumber.includes(searchLower)
          );
        });

        if (isMounted) {
          setClients(filtered);
        }
      } catch (error) {
        console.error(
          `[ClientSearch] Error searching clients for "${trimmedSearch}":`,
          error,
        );
        if (isMounted) {
          setClients([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 400); // Increased debounce to 400ms for better UX

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search, excludeIds]);

  const getDisplayName = useCallback((client: Client) => {
    const email = client.email ? ` (${client.email})` : "";
    return `${client.name.firstName} ${client.name.firstLastName}${email}`;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedClient ? getDisplayName(selectedClient) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : clients.length === 0 ? (
              <CommandEmpty>No se encontraron clientes</CommandEmpty>
            ) : (
              <CommandGroup>
                {clients.map((client) => {
                  const displayName = getDisplayName(client);
                  return (
                    <CommandItem
                      key={client.id}
                      value={displayName}
                      onSelect={() => {
                        setSelectedClient(client);
                        onSelect(client.id, client);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClient?.id === client.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getDisplayName(client)}
                        </span>
                        {client.identity_document && (
                          <span className="text-xs text-slate-500">
                            {client.identity_document.type}:{" "}
                            {client.identity_document.number}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
