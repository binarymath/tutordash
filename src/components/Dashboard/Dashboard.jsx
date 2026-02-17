import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Upload, Plus, X } from 'lucide-react';
import AppBar from '../Layout/AppBar';
import Navigation from '../Layout/Navigation';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import FileUpload from '../Common/FileUpload';
import SeletorBimestre from '../Common/SeletorBimestre';
import AnaliseTurma from '../AnalysisViews/AnaliseTurma';
import AnaliseIndividual from '../AnalysisViews/AnaliseIndividual';
import Card from '../Common/Card';

const Dashboard = () => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const {
        dadosMapao,
        viewMode,
        setViewMode,
        incluirInativos,
        setIncluirInativos,
        loading,
        error,
        bimestreAtual,
        setBimestreAtual,
        bimestresDisponiveis,
        bimestresCarregados
    } = useData();

    return (
        <div className="min-h-screen flex flex-col bg-brown-50 text-brown-900">
            {/* Material Design App Bar */}
            <AppBar
                onUploadClick={() => setShowUploadModal(true)}
                bimestresCarregados={bimestresCarregados}
            >
                {/* App Bar Controls */}
                {bimestresCarregados > 0 && (
                    <>
                        <SeletorBimestre
                            bimestreAtual={bimestreAtual}
                            bimestresDisponiveis={bimestresDisponiveis}
                            onChange={setBimestreAtual}
                        />

                        <Button
                            variant={incluirInativos ? 'contained' : 'outlined'}
                            color={incluirInativos ? 'primary' : 'primary'}
                            size="medium"
                            onClick={() => setIncluirInativos(!incluirInativos)}
                            aria-label={incluirInativos ? "Mostrando todos os alunos" : "Mostrando apenas alunos ativos"}
                            className="hidden sm:inline-flex"
                        >
                            {incluirInativos ? 'Todos' : 'Ativos'}
                        </Button>
                    </>
                )}
            </AppBar>

            {/* Navigation Tabs */}
            <Navigation
                viewMode={viewMode}
                onChange={setViewMode}
                bimestresCarregados={bimestresCarregados}
            />

            {/* Main Content */}
            <main className="flex-1 relative overflow-auto">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-brown-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-brown-900/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-[1800px] mx-auto px-4 md:px-6 py-6 md:py-8">
                    {/* Loading State */}
                    {loading && (
                        <div className="min-h-[400px] flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-brown-700 border-t-accent-gold rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-accent-gold rounded-full shadow-[0_0_10px_#FFB74D]" />
                                </div>
                            </div>
                            <p className="text-brown-800 font-semibold tracking-wide animate-pulse">
                                Processando dados acadêmicos...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <Card className="max-w-2xl mx-auto border-accent-red/30 bg-accent-red/10">
                            <div className="flex items-center gap-4 text-accent-red">
                                <div className="p-3 bg-accent-red/20 rounded-full">
                                    <X size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Erro ao carregar dados</h3>
                                    <p className="text-accent-red/80">{error}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Empty State */}
                    {!loading && bimestresCarregados === 0 && (
                        <div className="min-h-[60vh] flex items-center justify-center">
                            <Card className="max-w-2xl text-center py-12 md:py-16 px-8 md:px-12 border-brown-300 bg-gradient-to-br from-white/95 to-brown-50/80 shadow-elevation-8">
                                <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 md:mb-8 rounded-2xl bg-brown-200/40 flex items-center justify-center text-brown-700 ring-2 ring-brown-400/30">
                                    <Upload size={40} strokeWidth={1.5} className="md:w-12 md:h-12" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-extrabold text-brown-900 mb-3 md:mb-4">
                                    Comece sua Análise
                                </h2>
                                <p className="text-brown-800 text-base md:text-lg font-medium mb-6 md:mb-8 max-w-md mx-auto leading-relaxed">
                                    Importe os arquivos dos bimestres para visualizar métricas, gráficos e insights detalhados sobre suas turmas.
                                </p>
                                <Button
                                    variant="contained"
                                    color="accent"
                                    size="large"
                                    onClick={() => setShowUploadModal(true)}
                                    startIcon={<Plus size={20} />}
                                    className="shadow-elevation-6 hover:shadow-elevation-8"
                                >
                                    Carregar Primeiro Arquivo
                                </Button>
                            </Card>
                        </div>
                    )}

                    {/* Content Views */}
                    {!loading && dadosMapao && (
                        <div className="animate-fade-in">
                            {viewMode === 'turma' && <AnaliseTurma />}
                            {viewMode === 'individual' && <AnaliseIndividual />}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            {dadosMapao && (
                <footer className="bg-brown-950/80 backdrop-blur-sm border-t border-brown-800/50 px-4 md:px-6 py-4">
                    <div className="max-w-[1800px] mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs md:text-sm text-brown-400">
                        <span className="font-semibold text-brown-300">{dadosMapao.infoGeral.escola}</span>
                        <span className="w-1 h-1 rounded-full bg-brown-700 hidden sm:inline-block" />
                        <span className="hidden sm:inline">{dadosMapao.infoGeral.turma}</span>
                        <span className="w-1 h-1 rounded-full bg-brown-700 hidden sm:inline-block" />
                        <span>{bimestreAtual}º Bimestre</span>
                        <span className="w-1 h-1 rounded-full bg-brown-700 hidden sm:inline-block" />
                        <span className="hidden sm:inline">{dadosMapao.infoGeral.anoLetivo}</span>
                    </div>
                </footer>
            )}

            {/* Upload Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                title="Carregar Bimestre"
                maxWidth="lg"
            >
                <FileUpload />
            </Modal>

            {/* Fade-in Animation */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;

