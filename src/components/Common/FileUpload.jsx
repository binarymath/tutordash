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
                        w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-300 text-left group
                        ${isLoaded
                            ? 'bg-brown-900/40 border-accent-green/30 hover:bg-brown-900/60'
                            : 'bg-brown-900/50 border-brown-800 hover:border-accent-gold/50 hover:bg-brown-800/80'}
                    `}
                    onClick={handleButtonClick}
                >
                    <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300
                        ${status === 'loading' ? 'bg-accent-gold/20 text-accent-gold' :
                            status === 'success' || isLoaded ? 'bg-accent-green/20 text-accent-green' :
                                status === 'error' ? 'bg-accent-red/20 text-accent-red' :
                                    'bg-brown-800 text-brown-400 group-hover:text-accent-gold group-hover:bg-brown-800/80'}
                    `}>
                        {status === 'loading' ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : status === 'error' ? (
                            <XCircle size={24} />
                        ) : isLoaded || status === 'success' ? (
                            <CheckCircle size={24} />
                        ) : (
                            <Upload size={24} />
                        )}
                    </div>

                    <div className="flex flex-col flex-1">
                        <span className={`font-bold text-sm uppercase tracking-wider mb-1 ${isLoaded ? 'text-accent-green' : 'text-brown-300 group-hover:text-white'}`}>
                            {bimestre}º Bimestre
                        </span>

                        {isLoaded ? (
                            <span className="text-sm font-medium text-white truncate">
                                {dadosBimestres[bimestre]?.infoGeral?.turma || 'Dados carregados'}
                            </span>
                        ) : (
                            <span className="text-xs text-brown-400 group-hover:text-brown-200">
                                Clique para selecionar o arquivo
                            </span>
                        )}

                        {status === 'error' && (
                            <span className="text-xs text-accent-red mt-1 flex items-center gap-1">
                                <AlertCircle size={10} /> Falha no upload
                            </span>
                        )}
                    </div>

                    {!isLoaded && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-accent-gold transform translate-x-2 group-hover:translate-x-0">
                            <FileSpreadsheet size={20} />
                        </div>
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-brown-100 mb-2">
                    Carregar Mapões
                </h3>
                <p className="text-brown-400 text-sm leading-relaxed">
                    Selecione os arquivos Excel (.xlsx ou .xls) correspondentes a cada bimestre para gerar os gráficos evolutivos e comparativos.
                </p>
            </div>

            {/* Turma Selecionada */}
            {turmaSelecionada ? (
                <div className="mb-4 flex items-center gap-2 text-accent-gold bg-accent-gold/10 border border-accent-gold/30 px-4 py-3 rounded-xl">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">
                        Turma selecionada: {turmaSelecionada}
                    </span>
                </div>
            ) : (
                <div className="mb-4 flex items-center gap-2 text-accent-red bg-accent-red/10 border border-accent-red/30 px-4 py-3 rounded-xl">
                    <AlertCircle size={18} />
                    <span className="text-sm font-bold">
                        Nenhuma turma selecionada - selecione ou crie uma turma primeiro
                    </span>
                </div>
            )}

            {/* Mensagem de erro geral */}
            {error && (
                <div className="mb-4 flex items-center gap-2 text-accent-red bg-accent-red/10 border border-accent-red/30 px-4 py-3 rounded-xl">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(bim => (
                    <BimestreUploadButton key={bim} bimestre={bim} />
                ))}
            </div>

            {bimestresCarregados.length > 0 && (
                <div className="mt-6 flex items-center justify-center gap-2 text-accent-green bg-accent-green/10 border border-accent-green/20 px-4 py-3 rounded-xl animate-[fadeIn_0.5s_ease-out]">
                    <CheckCircle size={18} />
                    <span className="text-sm font-bold">
                        {bimestresCarregados.length} de 4 bimestres prontos para análise
                    </span>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
