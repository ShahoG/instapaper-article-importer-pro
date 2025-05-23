
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
      
      <div className="mt-8 max-w-md p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
        <h3 className="font-semibold mb-1">Demo Limitation</h3>
        <p>
          Note: This demonstration may experience CORS limitations when making direct API calls to Instapaper. 
          In a production environment, you would need to implement a server-side proxy or use serverless functions 
          to handle the API requests securely.
        </p>
      </div>
      
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
