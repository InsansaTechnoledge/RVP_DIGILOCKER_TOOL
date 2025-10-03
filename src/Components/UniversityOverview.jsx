import React, { useMemo, useState } from "react";
import { Search, Filter, SortAsc, CheckCircle2, CircleX, GraduationCap, BookOpen } from "lucide-react";
import { courses } from "../constants";

// Small UI helpers
const Badge = ({ children, tone = "indigo" }) => {
  const tones = {
    indigo: "bg-indigo-100 text-indigo-800",
    gray: "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.indigo}`}>
      {children}
    </span>
  );
};

const formatCBCS = (val) => {
  if (val === true) return "Yes";
  if (val === false) return "No";
  return "N/A";
};

const UniversityOverview = () => {
  const [query, setQuery] = useState("");
  const [cbcsFilter, setCbcsFilter] = useState("all"); // all | yes | no
  const [minSem, setMinSem] = useState("");
  const [maxSem, setMaxSem] = useState("");
  const [sortBy, setSortBy] = useState("name-asc"); // name-asc | name-desc | sem-asc | sem-desc

  const filteredCourses = useMemo(() => {
    let data = Array.isArray(courses) ? [...courses] : [];

    // Text search on name/stream if provided in your constants
    const q = query.trim().toLowerCase();
    if (q) {
      data = data.filter((c) => {
        const name = (c?.name || "").toLowerCase();
        const stream = (c?.stream || "").toLowerCase();
        return name.includes(q) || stream.includes(q);
      });
    }

    // CBCS filter
    if (cbcsFilter === "yes") data = data.filter((c) => c?.CBCS === true);
    if (cbcsFilter === "no") data = data.filter((c) => c?.CBCS === false);

    // Semester range
    const min = Number(minSem);
    const max = Number(maxSem);
    data = data.filter((c) => {
      const s = Number(c?.sem ?? 0);
      const geMin = Number.isNaN(min) || minSem === "" ? true : s >= min;
      const leMax = Number.isNaN(max) || maxSem === "" ? true : s <= max;
      return geMin && leMax;
    });

    // Sort
    const cmpStr = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    switch (sortBy) {
      case "name-asc":
        data.sort((a, b) => cmpStr(a?.name || "", b?.name || ""));
        break;
      case "name-desc":
        data.sort((a, b) => cmpStr(b?.name || "", a?.name || ""));
        break;
      case "sem-asc":
        data.sort((a, b) => (Number(a?.sem ?? 0) - Number(b?.sem ?? 0)));
        break;
      case "sem-desc":
        data.sort((a, b) => (Number(b?.sem ?? 0) - Number(a?.sem ?? 0)));
        break;
      default:
        break;
    }

    return data;
  }, [query, cbcsFilter, minSem, maxSem, sortBy]);

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      {/* <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7" />
          <div>
            <h2 className="text-xl font-semibold">University Overview</h2>
            <p className="text-sm text-gray-600">Browse courses, filter by CBCS and semester duration.</p>
          </div>
        </div>
        <Badge tone="blue">Total: {Array.isArray(courses) ? courses.length : 0}</Badge>
      </div> */}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mb-5">
        <div className="md:col-span-5 relative">
          <label className="block text-sm font-medium mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by course name or stream..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1 flex items-center gap-2">
            <Filter className="w-4 h-4" /> CBCS
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={cbcsFilter}
            onChange={(e) => setCbcsFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="yes">Yes only</option>
            <option value="no">No only</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Min Sem</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. 2"
            value={minSem}
            onChange={(e) => setMinSem(e.target.value)}
            min={0}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Max Sem</label>
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. 8"
            value={maxSem}
            onChange={(e) => setMaxSem(e.target.value)}
            min={0}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium mb-1 flex items-center gap-2">
            <SortAsc className="w-4 h-4" /> Sort
          </label>
          <select
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name-asc">Name ↑</option>
            <option value="name-desc">Name ↓</option>
            <option value="sem-asc">Sem ↑</option>
            <option value="sem-desc">Sem ↓</option>
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{filteredCourses.length}</span> of{" "}
          <span className="font-medium">{Array.isArray(courses) ? courses.length : 0}</span> courses
        </p>
      </div>

      {/* Grid */}
      {filteredCourses.length === 0 ? (
        <div className="border rounded-xl p-8 text-center text-gray-600">
          <CircleX className="w-8 h-8 mx-auto mb-2" />
          No courses match your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredCourses.map((c, idx) => (
            <div
              key={c?.id || `${c?.name}-${idx}`}
              className="rounded-2xl border p-4 shadow-sm hover:shadow-md transition bg-white/60 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <h3 className="font-semibold text-gray-900">{c?.name || "Untitled Course"}</h3>
                </div>
                <Badge tone="gray">{Number(c?.sem ?? 0)} Sem</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {c?.stream && <Badge tone="blue">{c.stream}</Badge>}
                <Badge tone={c?.CBCS ? "green" : "red"}>
                  {c?.CBCS ? (
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CBCS</span>
                  ) : (
                    "CBCS: No"
                  )}
                </Badge>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <p><span className="text-gray-500">Course Name:</span> <span className="font-medium">{c?.name || "N/A"}</span></p>
                <p><span className="text-gray-500">Semester Duration:</span> <span className="font-medium">{c?.sem ?? "N/A"}</span></p>
                <p><span className="text-gray-500">CBCS:</span> <span className="font-medium">{formatCBCS(c?.CBCS)}</span></p>
              </div>

              {/* <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  className="text-indigo-700 hover:text-indigo-900 text-sm font-medium"
                  onClick={() => console.log("View details:", c)}
                >
                  View details →
                </button>
              
              </div> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UniversityOverview;
