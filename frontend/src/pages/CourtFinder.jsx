import React, { useMemo, useRef, useState } from "react";
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

const NATIVE_SELECT_CLASS =
  "flex h-9 w-full appearance-none rounded-md border bg-gray-950 border-gray-700 text-white px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-9 bg-no-repeat bg-[length:1rem_1rem] bg-[position:right_0.5rem_center] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%200%201%201.06.02L10%2011.06l3.71-3.83a.75.75%200%201%201%201.08%201.04l-4.25%204.39a.75.75%200%200%201-1.08%200L5.21%208.27a.75.75%200%200%201%20.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')]";

const API_URL = import.meta.env.COURTFINDER_API_URL || "";

const BOOKING_TYPES = [
  { value: "40min", label: "40 minutes" },
  { value: "60min", label: "60 minutes" },
];
const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, "0")}:00`;
  return { value, label: value };
});

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
  const dateInputRef = useRef(null);
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

  const openDatePicker = () => {
    if (!dateInputRef.current) return;
    if (typeof dateInputRef.current.showPicker === "function") {
      dateInputRef.current.showPicker();
    } else {
      dateInputRef.current.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setResults(null);

    if (!API_URL) {
      setError("CourtFinder API URL not found.");
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
    <div className="min-h-screen bg-gray-800">
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

              <div className="space-y-2 min-w-0">
                <Label
                  htmlFor="date"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Calendar className="w-3 h-3 text-cyan-400" />
                  Date
                </Label>
                <div className="relative min-w-0">
                  <Input
                    id="date"
                    ref={dateInputRef}
                    type="date"
                    value={form.date}
                    onChange={handleChange("date")}
                    onFocus={openDatePicker}
                    onClick={openDatePicker}
                    required
                    className="bg-gray-950 border-gray-700 text-white focus-visible:ring-cyan-400 pr-10 appearance-none min-w-0 [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-0 [&::-webkit-date-and-time-value]:leading-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={openDatePicker}
                    aria-label="Open date picker"
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-white"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="time"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Time
                </Label>
                <select
                  id="time"
                  value={form.time}
                  onChange={handleChange("time")}
                  className={NATIVE_SELECT_CLASS}
                >
                  {TIME_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-gray-900 text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bookingType"
                  className="text-gray-300 font-mono text-xs tracking-wider uppercase flex items-center gap-2"
                >
                  <Trophy className="w-3 h-3 text-cyan-400" />
                  Booking length
                </Label>
                <select
                  id="bookingType"
                  value={form.bookingType}
                  onChange={handleChange("bookingType")}
                  className={NATIVE_SELECT_CLASS}
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
                </select>
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
