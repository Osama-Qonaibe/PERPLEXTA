import React, { useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, Wrench } from 'lucide-react';

export const AdminDiagnosticTool: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [missingFiles, setMissingFiles] = useState<string[]>([]);
  const [checkCompleted, setCheckCompleted] = useState(false);

  const runDiagnostic = () => {
    setIsChecking(true);
    setCheckCompleted(false);
    // Simulate API call
    setTimeout(() => {
      setMissingFiles(['/src/assets/logo.png', '/src/utils/config.ts']);
      setIsChecking(false);
      setCheckCompleted(true);
    }, 2000);
  };

  const repairAssets = () => {
    alert('Repairing assets...');
  };

  return (
    <div className="p-6 bg-[var(--surface-card)] rounded-[var(--radius)] border border-[var(--border-main)]">
      <h2 className="text-xl font-bold mb-4">Orphaned Asset Diagnostic</h2>
      <button 
        onClick={runDiagnostic}
        disabled={isChecking}
        className="px-4 py-2 bg-[var(--bg-accent-emphasis)] text-white rounded flex items-center gap-2"
      >
        {isChecking ? <RefreshCw className="animate-spin" /> : <AlertCircle />}
        Run Diagnostic
      </button>

      {checkCompleted && (
        <div className="mt-4">
          {missingFiles.length === 0 ? (
            <p className="text-green-500 flex items-center gap-2"><CheckCircle /> No missing files detected.</p>
          ) : (
            <div>
              <p className="text-red-500 mb-2">Detected {missingFiles.length} missing files:</p>
              <ul className="list-disc pl-5 mb-4">
                {missingFiles.map(file => <li key={file}>{file}</li>)}
              </ul>
              <button 
                onClick={repairAssets}
                className="px-4 py-2 bg-yellow-600 text-white rounded flex items-center gap-2"
              >
                <Wrench /> Repair Assets
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
