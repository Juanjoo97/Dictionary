"use client";

import { useState, useEffect } from "react";

interface Definition {
  definition: string;
  example?: string;
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
}

interface WordData {
  word: string;
  phonetic?: string;
  phonetics?: string;
  meanings: Meaning[];
  sourceUrls?: string[];
}

export default function Dictionary() {
  const fonts = [
    { label: "Serif", tailwindClass: "font-serif" },
    { label: "Sans Serif", tailwindClass: "font-sans" },
    { label: "Monospace", tailwindClass: "font-mono" }
  ];
  // Estados para la búsqueda y los resultados
  const [searchTerm, setSearchTerm] = useState(""); // Almacena la palabra que el usuario está buscando
  const [wordData, setWordData] = useState<WordData[]>([]); // Guarda los datos obtenidos de la API
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null); // Almacena la palabra seleccionada para mostrar detalles

  // Estados para el control de carga y errores
  const [loading, setLoading] = useState<boolean>(false); // Indica si la búsqueda está en progreso
  const [error, setError] = useState<string | null>(null); // Almacena posibles mensajes de error

  // Estados de UI
  const [darkMode, setDarkMode] = useState(false); // Controla si el modo oscuro está activado
  const [currentFont, setCurrentFont] = useState(fonts[0]); // Define la fuente actual seleccionada
  const [isOpen, setIsOpen] = useState(false); // Maneja el estado del menú de selección de fuentes
  const [showDropdown, setShowDropdown] = useState(false); // Controla si el dropdown de sugerencias está visible

  // Estado para optimizar la búsqueda
  const [debouncedSearch, setDebouncedSearch] = useState(""); // Almacena el término de búsqueda con debounce para evitar múltiples llamadas a la API

  // Historial de búsqueda
  const [history, setHistory] = useState<{ word: string; index: number; timestamp: string }[]>([]); // Guarda el historial de palabras buscadas con su índice y timestamp

  // Control de eventos de búsqueda
  const [triggeredByEnter, setTriggeredByEnter] = useState(false); // Indica si la búsqueda fue activada presionando "Enter"

  // Alterna el estado del menú desplegable de selección de fuentes
  const toggleDropdown = () => setIsOpen(!isOpen);

  // Cambia la fuente actual y cierra el menú desplegable
  const selectFont = (font: typeof fonts[number]) => {
    setCurrentFont(font);
    setIsOpen(false);
  };

  // Manejar la búsqueda en tiempo real
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim()) {
      setShowDropdown(true); // Mantiene el dropdown mientras escribe
    } else {
      setShowDropdown(false);
      setWordData([]); // Limpia la data
      setSelectedWord(null); // Evita que selectedWord mantenga una palabra anterior
    }
  };

  // Maneja la búsqueda cuando el usuario presiona la tecla "Enter"
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setShowDropdown(false);
      setTriggeredByEnter(true);
      const data = await fetchWord(searchTerm.trim());
      if (data && data.length > 0) {
        setSelectedWord(data[0]);
        // Agregar al historial directamente
        addToHistory(data[0].word, data);
      }
    }
  };

  /**
   * Realiza una solicitud a la API del diccionario para obtener definiciones de una palabra.
   * @param word - La palabra a buscar.
   * @returns Una lista de objetos `WordData` con las definiciones o `null` si no se encontraron resultados.
   */
  const fetchWord = async (word: string): Promise<WordData[] | null> => {
    const trimmedSearch = word.trim();
    if (!trimmedSearch) {
      setError("Please enter a word before searching.");
      setWordData([]);
      return null;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${trimmedSearch}`);
      if (!res.ok) throw new Error("No definitions found.");
      const data: WordData[] = await res.json();
      if (data.length > 0) {
        setWordData(data);
        setError(null);
        return data; // Retorna los datos para usarlos directamente
      } else {
        setError("No definitions found.");
        setWordData([]);
        return null;
      }
    } catch (err) {
      setWordData([]);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  };


  /**
   * Agrega una palabra al historial de búsqueda, evitando duplicados y limitando la cantidad de entradas.
   * @param word - La palabra buscada.
   * @param wordData - Lista de datos de la palabra obtenida desde la API.
   * @param specificIndex - (Opcional) Índice específico dentro de `wordData` para registrar en el historial.
   */
  const addToHistory = (word: string, wordData: WordData[], specificIndex?: number) => {
    const index = specificIndex !== undefined
      ? specificIndex
      : wordData.findIndex(w => w.word.toLowerCase() === word.toLowerCase());

    if (index === -1) {
      return;
    }

    setHistory((prevHistory) => {
      // Verificar si la palabra ya está en el historial con el mismo índice
      const alreadyExists = prevHistory.some(
        (h) => h.word.toLowerCase() === word.toLowerCase() && h.index === index
      );
      if (alreadyExists) {
        return prevHistory; // No agregar duplicados con el mismo índice
      }
      const newEntry = {
        word,
        index,
        timestamp: new Date().toLocaleString(),
      };
      const updatedHistory = [newEntry, ...prevHistory.slice(0, 9)];
      localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  // Obtener transcripción fonética y audio
  const phoneticText = Array.isArray(selectedWord?.phonetics)
    ? selectedWord.phonetics.find((p) => p?.text)?.text || ""
    : "";
  const phoneticAudio = Array.isArray(selectedWord?.phonetics)
    ? selectedWord.phonetics.find((p) => typeof p.audio === "string")?.audio || ""
    : "";
  const playAudio = () => {
    if (phoneticAudio) {
      new Audio(phoneticAudio).play();
    }
  };

  /**
   * Aplica el tema oscuro o claro a la aplicación y lo guarda en el almacenamiento local.
   * Se ejecuta cada vez que cambia el estado `darkMode`.
   */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  /**
   * Aplica un debounce a `searchTerm`, estableciendo un valor retrasado en `debouncedSearch`.
   * Se ejecuta cada vez que `searchTerm` cambia.
   */
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 0); // Esperar 0 ms
    return () => clearTimeout(handler);
  }, [searchTerm]);

  /**
   * Realiza una búsqueda cuando `debouncedSearch` cambia.
   * Si `debouncedSearch` está vacío, limpia los resultados y oculta el dropdown.
   */
  useEffect(() => {
    if (debouncedSearch) {
      fetchWord(debouncedSearch);
    } else {
      setWordData([]); // Limpia los resultados si el input está vacío
      setSelectedWord(null); // Evita que se mantenga una palabra anterior
      setShowDropdown(false);
    }
  }, [debouncedSearch]);

  /**
   * Selecciona automáticamente una palabra de `wordData` cuando se actualiza el historial o se realiza una nueva búsqueda.
   * Se ejecuta cada vez que `wordData`, `triggeredByEnter`, `searchTerm` o `history` cambian.
   */
  useEffect(() => {
    if (wordData.length > 0 && !selectedWord) { // Solo si no hay una palabra seleccionada
      const lastEntry = history.find(h => h.word.toLowerCase() === searchTerm.toLowerCase());
      if (lastEntry) {
        setSelectedWord(wordData[lastEntry.index] || wordData[0]);
      } else if (triggeredByEnter) {
        setSelectedWord(wordData[0]);
      }
    }
  }, [wordData, triggeredByEnter, searchTerm, history, JSON.stringify(selectedWord)]);

  /**
   * Carga el historial de búsqueda almacenado en `localStorage` cuando el componente se monta.
   * Se ejecuta solo una vez, ya que el array de dependencias está vacío (`[]`).
   */
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    setHistory(savedHistory);
  }, []);

  return (
    <div
      className={`min-h-screen bg-white text-gray-900 flex flex-col items-center  transition-colors duration-300 ${darkMode ? "dark:bg-[#121212]" : ""
        }`}>
      {/* Encabezado */}
      <header className="w-full max-w-lg flex justify-between items-center px-6 py-3 pt-10">
        {/* Icono del libro */}
        <div onClick={() => window.location.reload()} className={`cursor-pointer relative w-8 h-8.5 border-2 border-gray-500 rounded-md bg-white  ${darkMode ? "dark:border-gray-300 dark:bg-gray-800" : ""}`}>
          <div className={`absolute top-2 left-2 w-3 h-0.5 bg-gray-500 ${darkMode ? "dark:bg-gray-300" : ""}`}></div>
          <div className={`absolute -bottom-0.5 -left-0.5 w-full h-3 border-2 border-gray-500  rounded-l-full bg-white  border-r-white  pl-7 ${darkMode ? "dark:border-gray-300 dark:bg-gray-800 dark:border-r-gray-800" : ""}`}></div>
        </div>
        {/* Controles a la derecha */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-4">
            {/* Selector de fuente */}
            <div className="relative">
              {/* Botón de selección de fuente */}
              <div className="flex items-center gap-1">
                <span className={`text-gray-700 font-bold ${currentFont.tailwindClass}`}>
                  {currentFont.label}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-purple-500 cursor-pointer"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onClick={toggleDropdown}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {/* Menú desplegable */}
              {isOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                  {fonts.map((font) => (
                    <button
                      key={font.tailwindClass}
                      className={`block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 cursor-pointer ${font.tailwindClass}`}
                      onClick={() => selectFont(font)}>
                      {font.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="h-5 border-l border-[#eeeeee]"></div>
            {/* Toggle de modo oscuro */}
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)} />
              <div className="w-12 h-6 bg-gray-400 peer-checked:bg-gray-700 rounded-full relative transition">
                <div
                  className={`w-5 h-5 bg-white absolute top-0.5 rounded-full transition-all duration-300 ease-in-out ${darkMode ? "left-6" : "left-1"
                    }`}></div>
              </div>
            </label>
            {/* Icono de luna */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        </div>
      </header>
      {/* Historial de Busqueda */}
      {history.length > 0 && (
        <div className="mt-6 w-full max-w-lg p-6 ">
          <h3 className={`text-lg text-center font-semibold text-[#262626] ${darkMode ? "text-[#ffff]" : ""} ${currentFont.tailwindClass}`}>
            Search History
          </h3>
          <ul className={`list-disc list-inside mt-2 max-h-48 overflow-auto border p-2 rounded-lg break-all sm:break-normal ${darkMode ? "text-[#ffff] border-white" : "border-black"} sm:max-h-64`}>
            {history.map((item, index) => (
              <li key={index} className={`flex items-center gap-1 font-semibold text-[#262626] ${darkMode ? "text-[#ffff]" : ""} ${currentFont.tailwindClass}`}>
                <span>•</span>
                <button
                  onClick={async () => {
                    setSearchTerm(item.word);
                    setTriggeredByEnter(false);

                    const data = await fetchWord(item.word);
                    console.log("Palabra buscada:", item.word);
                    console.log("Índice esperado:", item.index);
                    console.log("Resultados obtenidos:", data);

                    if (data && data.length > 0) {
                      const validIndex = item.index >= 0 && item.index < data.length ? item.index : 0;
                      console.log("Índice usado:", validIndex);

                      // Asegurar que React detecte el cambio creando un nuevo objeto
                      setSelectedWord({ ...data[validIndex] });

                      // También puedes intentar forzar una actualización del estado
                      setWordData([...data]);
                    }
                    else {
                      console.warn("No se encontraron resultados para:", item.word);
                    }
                  }}
                  className="text-purple-500 underline cursor-pointer inline-flex"
                >
                  {item.word}
                </button>
                <span className="text-xs text-gray-400">({item.timestamp})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Barra de búsqueda */}
      <div className="w-full max-w-lg p-6 rounded-lg ">
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a word..."
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className={`w-full h-13 p-4 pr-8 rounded-xl text-lg outline-none bg-[#F4F4F4] text-[#262626] font-bold ${currentFont.tailwindClass}`}
            />
            <button
              onClick={() => fetchWord(searchTerm.trim())}
              className="absolute right-1 top-1.5 flex items-center justify-center w-10 h-10 bg-transparent text-purple-500 cursor-pointer">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-5 h-5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
          {/* Dropdown dinámico */}
          {showDropdown && wordData.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50 p-4 
                  max-h-60 overflow-y-auto">
              {wordData.slice(0, 5).map((word, index) => (
                <div
                  key={index}
                  className="p-2 border-b last:border-none cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    setSearchTerm(word.word); // Llenar input al hacer clic
                    setSelectedWord(word); // Guardar palabra seleccionada
                    setShowDropdown(false); // Ocultar dropdown
                    // Al seleccionar una palabra del dropdown, guardamos el índice específico
                    const specificIndex = wordData.findIndex(w => w === word); // Esto usa igualdad por referencia
                    addToHistory(word.word, wordData, specificIndex); // Pasamos el índice específico
                  }}>
                  <h2 className="text-lg font-bold">{word.word}</h2>
                  {word.meanings.slice(0, 1).map((meaning, idx) => (
                    <div key={idx}>
                      <p className="italic text-gray-600">{meaning.partOfSpeech}</p>
                      <ul className="list-disc list-inside">
                        {meaning.definitions.slice(0, 1).map((def, i) => (
                          <li key={i} className="text-gray-800">
                            {def.definition.length > 10
                              ? def.definition.substring(0, 50) + "..."
                              : def.definition}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        {loading && <p className="mt-3 text-gray-600">Loading...</p>}
        {error && <p className="mt-3 text-red-500">{error}</p>}
        {selectedWord && !showDropdown && (
          <div className="mt-6">
            {/* Encabezado */}
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className={`text-[2.5rem] font-semibold text-[#262626] w-full sm:break-normal md:break-all break-all whitespace-normal ${darkMode ? "text-[#ffff]" : ""} ${currentFont.tailwindClass}`}>
                  {selectedWord.word}
                </h2>
                <p className={`text-purple-500 text-xl ${currentFont.tailwindClass}`}>
                  {phoneticText}
                </p>
              </div>
              {phoneticAudio && (
                <button
                  onClick={playAudio}
                  className="flex items-center justify-center w-14 h-14 bg-[#e8d0fa] bg-opacity-50 rounded-full text-purple-600 text-2xl cursor-pointer ml-4 flex-shrink-0">
                  <span>▶</span>
                </button>
              )}
            </div>
            {/* Significados */}
            {wordData.length > 0 && selectedWord.meanings.map((meaning, index) => (<div key={index} className="mt-6">
              <div className="flex flex-row gap-2">
                <h2 className={`text-[#2d2d2d] font-bold italic  ${darkMode ? "text-[#ffff]" : ""} ${currentFont.tailwindClass}`}>{meaning.partOfSpeech}</h2>
                <hr className="border-t border-gray-300 w-full self-center" />
              </div>
              <br />
              <h3 className={`tracking-wide text-sm text-[#858585] ${currentFont.tailwindClass}`}>Meaning</h3>
              <br />
              <ul className="list-disc list-outside ml-10 text-[#646464] space-y-2 marker:text-purple-500">
                {meaning.definitions.map((def, idx) => (
                  <li key={idx} className={`text-[1rem] leading-relaxed ${currentFont.tailwindClass}`}>
                    {def.definition}
                    {meaning.partOfSpeech === "verb" && def.example && (
                      <>
                        <br />
                        <span className="text-[#828282]">"{def.example}"</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <br />
              <br />
              {/* Mostrar sinónimos si existen en el nivel correcto */}
              {meaning.partOfSpeech === "noun" && meaning.synonyms?.length > 0 && (
                <div className="flex flex-row gap-2">
                  <h2 className={`tracking-wide text-sm text-[#858585] ${currentFont.tailwindClass}`}>Synonyms</h2>
                  <span className={`text-[#a445ed] font-semibold ${currentFont.tailwindClass}`}>
                    {meaning.synonyms?.join(", ")}
                  </span>
                </div>
              )}
            </div>
            ))}
            <hr className="border-t border-gray-300 w-full self-center" />
            {/* Fuente */}
            {selectedWord?.sourceUrls && (
              <p className={`mt-6 text-[#858585] text-sm flex flex-col md:flex-row items-start gap-2 ${currentFont.tailwindClass}`}>
                <span>Source</span>
                <span className="flex flex-row items-center gap-1 w-full sm:w-auto">
                  <a
                    href={selectedWord.sourceUrls[0]}
                    className="text-[#646464] underline break-words whitespace-normal break-all sm:w-auto"
                  >
                    {selectedWord?.sourceUrls[0]}
                  </a>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 5H5v14h14v-4" />
                    <path d="M14 3h7v7" />
                    <path d="M10 14 21 3" />
                  </svg>
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}