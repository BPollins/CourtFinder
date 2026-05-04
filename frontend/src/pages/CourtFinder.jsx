import React, { useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Trophy,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

const API_URL = import.meta.env.VITE_COURTFINDER_API_URL || "";

const BOOKING_TYPES = [
  { value: "40min", label: "40 minutes" },
  { value: "60min", label: "60 minutes" },
];

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const formatProviderLabel = (raw) => {
  if (!raw) return "Provider";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatFacilityLabel = (raw) => {
  if (!raw) return "Unknown facility";
  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatTime = (raw) => {
  if (!raw) return "";
  const [hours, minutes] = raw.split(":");
  if (!hours || !minutes) return raw;
  return `${hours}:${minutes}`;
};

const CourtFinder = () => {
  const [form, setForm] = useState({
    postcode: "",
    date: todayIsoDate(),
    time: "18:00",
    bookingType: "60min",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResults(null);

    if (!API_URL) {
      setError(
        "API URL is not configured. Set VITE_COURTFINDER_API_URL in your .env."
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postcode: form.postcode,
          date: form.date,
          time: form.time.length === 5 ? `${form.time}:00` : form.time,
          bookingType: form.bookingType,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload.error || `Request failed with status ${response.status}.`
        );
      }
      setResults(payload);
    } catch (err) {
      setError(err.message || "Something went wrong calling the CourtFinder API.");
    } finally {
      setSubmitting(false);
    }
  };

  const courts = results?.courts ?? [];
  const providerErrors = results?.errors ?? [];

  const grouped = useMemo(() => {
    const map = new Map();
    for (const court of courts) {
      const key = court.provider || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(court);
    }
    return Array.from(map.entries()).map(([provider, items]) => ({
      provider,
      items: items.slice().sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    }));
  }, [courts]);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white font-mono tracking-wider uppercase">
            COURTFINDER
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto" />
          <p className="text-gray-400 max-w-2xl mx-auto">
            Search badminton court availability across multiple providers in one
            place. Pick a date, time and booking length and we&apos;ll fan out
            to every connected provider in parallel.
          </p>
        </header>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-xl font-mono tracking-wider uppercase flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="postcode"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  Location
                </Label>
                <Input
                  id="postcode"
                  type="text"
                  placeholder="e.g. SW1A 1AA"
                  value={form.postcode}
                  onChange={handleChange("postcode")}
                  className="bg-gray-950 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="date"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange("date")}
                  required
                  className="bg-gray-950 border-gray-700 text-white focus-visible:ring-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="time"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={form.time}
                  onChange={handleChange("time")}
                  required
                  className="bg-gray-950 border-gray-700 text-white focus-visible:ring-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bookingType"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Trophy className="w-3 h-3 text-cyan-400" />
                  Booking length
                </Label>
                <Select
                  id="bookingType"
                  value={form.bookingType}
                  onChange={handleChange("bookingType")}
                  className="bg-gray-950 border-gray-700 text-white focus-visible:ring-cyan-400"
                >
                  {BOOKING_TYPES.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-gray-900 text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="md:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:from-cyan-500 hover:to-blue-600 font-mono text-sm tracking-wider uppercase px-8 py-6 rounded-none transition-all duration-200 hover:scale-105 font-semibold disabled:opacity-60 disabled:hover:scale-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SEARCHING
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      FIND COURTS
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="border border-red-900 bg-red-950/40 text-red-300 px-4 py-3 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-sm leading-relaxed">{error}</span>
          </div>
        )}

        {providerErrors.length > 0 && (
          <div className="border border-yellow-900 bg-yellow-950/30 text-yellow-200 px-4 py-3 rounded-md space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs tracking-wider uppercase">
              <AlertTriangle className="w-4 h-4" />
              Some providers failed
            </div>
            <ul className="text-xs text-yellow-300/80 list-disc list-inside">
              {providerErrors.map((entry, index) => (
                <li key={index}>
                  <span className="font-semibold">
                    {formatProviderLabel(entry.provider)}
                  </span>
                  : {entry.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {results && courts.length === 0 && !error && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center space-y-3">
              <p className="text-white font-mono tracking-wider uppercase text-sm">
                No courts found
              </p>
              <p className="text-gray-400 text-sm">
                Try a different time window, date, or booking length.
              </p>
            </CardContent>
          </Card>
        )}

        {grouped.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-white font-mono tracking-wider uppercase">
                Results
              </h2>
              <span className="text-gray-500 font-mono text-xs tracking-wider uppercase">
                {courts.length} {courts.length === 1 ? "court" : "courts"} found
              </span>
            </div>

            <div className="space-y-8">
              {grouped.map(({ provider, items }) => (
                <div key={provider} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-mono tracking-wider uppercase text-sm">
                      {formatProviderLabel(provider)}
                    </h3>
                    <span className="text-gray-600 font-mono text-xs">
                      {items.length}{" "}
                      {items.length === 1 ? "slot" : "slots"}
                    </span>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((court, index) => (
                      <Card
                        key={`${provider}-${index}`}
                        className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-all duration-200"
                      >
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-white font-semibold leading-tight">
                                {formatFacilityLabel(court.facilityLocation)}
                              </p>
                              <p className="text-gray-500 text-xs font-mono mt-1">
                                {court.date}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-gray-600 text-gray-300 font-mono text-xs"
                            >
                              {court.bookingType}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-cyan-400 font-mono text-lg">
                              <Clock className="w-4 h-4" />
                              {formatTime(court.time)}
                            </div>
                            <div className="text-white font-semibold">
                              {court.price || "—"}
                            </div>
                          </div>

                          {court.bookingUrl && (
                            <Button
                              asChild
                              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:from-cyan-500 hover:to-blue-600 font-mono text-xs tracking-wider uppercase rounded-none font-semibold"
                            >
                              <a
                                href={court.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Book
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CourtFinder;
