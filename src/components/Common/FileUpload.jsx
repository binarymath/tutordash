import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTurma } from '../../contexts/TurmaContext';
import { lerMapao } from '../../services/mapaoService';

const FileUpload = () => {
    const { turmaSelecionada, adicionarBimestre, obterBimestres } = useTurma();
    const [uploadStatus, setUploadStatus] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Obter bimestres carregados da turma atual
    const dadosBimestres = obterBimestres(turmaSelecionada);
    const bimestresCarregados = Object.keys(dadosBimestres).filter(bim => dadosBimestres[bim] !== null);

    const handleFileChange = async (bimestre, file) => {
        if (!file) return;

        if (!turmaSelecionada) {
            setError('Por favor, selecione uma turma antes de fazer upload');
            return;
        }

        // Valida o tipo de arquivo
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
            return;
        }

        setLoading(true);
        setError(null);
        setUploadStatus(prev => ({ ...prev, [bimestre]: 'loading' }));
        console.log(`Iniciando upload do ${bimestre}º bimestre para turma ${turmaSelecionada}...`);

        try {
            const dados = await lerMapao(file);
            console.log('Dados lidos:', dados);
            adicionarBimestre(turmaSelecionada, bimestre, dados);
            setUploadStatus(prev => ({ ...prev, [bimestre]: 'success' }));
            console.log(`Dados do ${bimestre}º bimestre carregados com sucesso.`);
        } catch (err) {
            console.error('Erro ao processar arquivo:', err);
            setError(`Erro ao carregar ${bimestre}º bimestre: ${err.message}`);
            setUploadStatus(prev => ({ ...prev, [bimestre]: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const BimestreUploadButton = ({ bimestre }) => {
        const fileInputRef = useRef(null);
        const isLoaded = dadosBimestres[bimestre] !== null;
        const status = uploadStatus[bimestre];

        const handleButtonClick = () => {
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input to allow selecting the same file again
                fileInputRef.current.click();
            }
        };

        const handleInputChange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileChange(bimestre, file);
            }
        };

        return (
            <div className="w-full">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleInputChange}
                    style={{ display: 'none' }}
                />

                <button
                    className={`
                        w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all duration-300 text-left group relative overflow-hidden
                        ${isLoaded
                            ? 'bg-white border-accent-green/50 hover:border-accent-green shadow-sm'
                            : 'bg-white border-brown-200 hover:border-accent-gold hover:shadow-md hover:-translate-y-0.5'}
                    `}
                    onClick={handleButtonClick}
                >
                    <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm
                        ${status === 'loading' ? 'bg-accent-gold/10 text-accent-gold' :
                            status === 'success' || isLoaded ? 'bg-accent-green/10 text-accent-green' :
                                status === 'error' ? 'bg-accent-red/10 text-accent-red' :
                                    'bg-brown-100 text-brown-500 group-hover:bg-accent-gold/10 group-hover:text-accent-gold'}
                    `}>
                        {status === 'loading' ? (
                            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : status === 'error' ? (
                            <XCircle size={24} />
                        ) : isLoaded || status === 'success' ? (
                            <CheckCircle size={24} />
                        ) : (
                            <Upload size={24} />
                        )}
                    </div>

                    <div className="flex flex-col flex-1 z-10">
                        <span className={`font-bold text-sm uppercase tracking-wider mb-0.5 ${isLoaded ? 'text-accent-green' : 'text-brown-900 group-hover:text-accent-gold transition-colors'}`}>
                            {bimestre}º Bimestre
                        </span>

                        {isLoaded ? (
                            <span className="text-sm font-semibold text-brown-700 truncate">
                                {dadosBimestres[bimestre]?.infoGeral?.turma || 'Dados carregados'}
                            </span>
                        ) : (
                            <span className="text-sm text-brown-500 group-hover:text-brown-700 transition-colors">
                                Clique para selecionar arquivo
                            </span>
                        )}

                        {status === 'error' && (
                            <span className="text-xs text-accent-red mt-1 flex items-center gap-1 font-medium">
                                <AlertCircle size={12} /> Falha no upload
                            </span>
                        )}
                    </div>

                    {!isLoaded && (
                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 text-brown-300 transform translate-x-4 group-hover:translate-x-0">
                            <FileSpreadsheet size={24} />
                        </div>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="mb-8 text-center sm:text-left">
                <h3 className="text-2xl font-bold text-brown-900 mb-2 flex items-center gap-2 justify-center sm:justify-start">
                    <FileSpreadsheet className="text-accent-gold" size={28} />
                    Carregar Mapões
                </h3>
                <p className="text-brown-600 text-base leading-relaxed max-w-2xl">
                    Selecione os arquivos Excel (.xlsx ou .xls) correspondentes a cada bimestre para gerar os gráficos evolutivos e comparativos.
                </p>
            </div>

            {/* Turma Selecionada */}
            {turmaSelecionada ? (
                <div className="mb-6 flex items-center gap-3 text-brown-950 bg-white border-2 border-brown-200 px-5 py-4 rounded-xl shadow-md">
                    <div className="bg-brown-900 rounded-full p-1 text-white shadow-sm ring-2 ring-brown-100">
                        <CheckCircle size={20} strokeWidth={3} />
                    </div>
                    <div>
                        <span className="block text-xs font-extrabold text-brown-600 uppercase tracking-wide mb-0.5">Turma Ativa</span>
                        <span className="text-xl font-black text-brown-950 tracking-tight leading-none">
                            {turmaSelecionada}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="mb-6 flex items-center gap-3 text-accent-red bg-red-50 border border-red-200 px-5 py-4 rounded-xl shadow-sm">
                    <AlertCircle size={24} />
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wide opacity-80">Atenção</span>
                        <span className="text-sm font-bold">
                            Nenhuma turma selecionada - selecione ou crie uma turma primeiro
                        </span>
                    </div>
                </div>
            )}

            {/* Mensagem de erro geral */}
            {error && (
                <div className="mb-6 flex items-center gap-3 text-accent-red bg-red-50 border border-red-200 px-5 py-4 rounded-xl shadow-sm animate-shake">
                    <AlertCircle size={24} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(bim => (
                    <BimestreUploadButton key={bim} bimestre={bim} />
                ))}
            </div>

            {bimestresCarregados.length > 0 && (
                <div className="mt-8 flex items-center justify-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-xl animate-[fadeIn_0.5s_ease-out] shadow-sm">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="text-sm font-bold">
                        {bimestresCarregados.length} de 4 bimestres prontos para análise
                    </span>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
