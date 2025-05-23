
import ImportForm from "@/components/ImportForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center p-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-instapaper-blue mb-2">
          Instapaper CSV Importer
        </h1>
        <p className="text-gray-600 max-w-md">
          Import your reading list to Instapaper from a CSV file
        </p>
      </header>

      <ImportForm />
      
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>
          This tool uses the{" "}
          <a 
            href="https://www.instapaper.com/api/full" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-instapaper-blue transition-colors"
          >
            Instapaper API
          </a>
        </p>
        <p className="mt-1">
          CSV Format: title, url, time_added, tags, status
        </p>
      </footer>
    </div>
  );
};

export default Index;
