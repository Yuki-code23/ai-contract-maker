'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Encoding from 'encoding-japanese';
import BackButton from '@/components/BackButton';
import Sidebar from '@/components/Sidebar';
import { extractPartiesFromText } from '@/lib/gemini';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, migrateTemplates } from '@/app/actions/templates';
import { getCompanies, createCompany } from '@/app/actions/companies';
import { getUserSettings } from '@/app/actions/settings';
import { UserMenu } from '@/components/UserMenu';

interface SavedTemplate {
    id: string;
    name: string;
    partyA: string;
    partyB: string;
    addressA?: string;
    addressB?: string;
    presidentPositionA?: string;
    presidentNameA?: string;
    presidentPositionB?: string;
    presidentNameB?: string;
    content: string;
    savedAt: string;
}

interface Company {
    id: number;
    name: string;
    postalCode: string;
    address: string;
    building: string | null;
    presidentTitle: string;
    presidentName: string;
    contactPerson: string;
    email: string;
    phone: string;
    position: string | null;
    contractCount: number;
}

export default function TemplatePage() {
    const router = useRouter();
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState(''); // State for editable file name
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState(''); // Store original content
    const [originalPartyA, setOriginalPartyA] = useState<string[]>([]); // Store extracted original party A names (variations)
    const [originalPartyB, setOriginalPartyB] = useState<string[]>([]); // Store extracted original party B names (variations)
    const [originalAddressA, setOriginalAddressA] = useState<string[]>([]); // Store extracted original address A (variations)
    const [originalAddressB, setOriginalAddressB] = useState<string[]>([]); // Store extracted original address B (variations)
    const [originalPresidentPositionA, setOriginalPresidentPositionA] = useState<string[]>([]); // Store extracted original president position A (variations)
    const [originalPresidentNameA, setOriginalPresidentNameA] = useState<string[]>([]); // Store extracted original president name A (variations)
    const [originalPresidentPositionB, setOriginalPresidentPositionB] = useState<string[]>([]); // Store extracted original president position B (variations)
    const [originalPresidentNameB, setOriginalPresidentNameB] = useState<string[]>([]); // Store extracted original president name B (variations)
    const [partyA, setPartyA] = useState('');
    const [partyB, setPartyB] = useState('');
    const [addressA, setAddressA] = useState('');
    const [addressB, setAddressB] = useState('');
    const [presidentPositionA, setPresidentPositionA] = useState('');
    const [presidentNameA, setPresidentNameA] = useState('');
    const [presidentPositionB, setPresidentPositionB] = useState('');
    const [presidentNameB, setPresidentNameB] = useState('');
    const [savedPartyBInfo, setSavedPartyBInfo] = useState(''); // Store saved Party B info from settings
    const [savedPartyBAddress, setSavedPartyBAddress] = useState(''); // Store saved Party B address from settings
    const [savedPartyBPresidentPosition, setSavedPartyBPresidentPosition] = useState(''); // Store saved Party B president position
    const [savedPartyBPresidentName, setSavedPartyBPresidentName] = useState(''); // Store saved Party B president name
    const [savedSellerInfo, setSavedSellerInfo] = useState<{ name: string, address: string, presidentTitle: string, presidentName: string, staffTitle: string, staffName: string } | null>(null); // Store saved Seller Info (Party A)
    const [isEditing, setIsEditing] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null); // Track if we are editing an existing saved template
    const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]); // Store companies loaded from localStorage
    const [showPartyASuggestions, setShowPartyASuggestions] = useState(false); // Toggle for Party A suggestions dropdown
    const [showPartyBSuggestions, setShowPartyBSuggestions] = useState(false); // Toggle for Party B suggestions dropdown
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isExtractingParties, setIsExtractingParties] = useState(false);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [targetParty, setTargetParty] = useState<'partyA' | 'partyB' | null>(null);
    const [companySearchQuery, setCompanySearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load saved templates, settings and companies from server
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Load Templates
                const templatesData = await getTemplates();
                setSavedTemplates(templatesData || []);

                // 2. Load User Settings (Party B)
                const settings = await getUserSettings();
                if (settings && settings.party_b_info) {
                    const info = settings.party_b_info;
                    if (info.companyName) {
                        setSavedPartyBInfo(info.companyName);

                        // Construct full address
                        const parts = [
                            info.postalCode ? `〒${info.postalCode}` : '',
                            info.address,
                            info.building
                        ].filter(Boolean);
                        setSavedPartyBAddress(parts.join(' '));
                        setSavedPartyBPresidentPosition(info.presidentTitle || '');
                        setSavedPartyBPresidentName(info.presidentName || '');
                    }
                }

                // 3. Load Seller Info (Party A)
                if (settings && settings.company_profile) {
                    const profile = settings.company_profile;
                    setSavedSellerInfo({
                        name: profile.name || '',
                        address: profile.address || '',
                        presidentTitle: profile.president_title || '',
                        presidentName: profile.president_name || '',
                        staffTitle: profile.staff_title || '',
                        staffName: profile.staff_name || ''
                    });
                }

                // 3. Load Companies
                const companiesData = await getCompanies();
                if (companiesData && companiesData.length > 0) {
                    setCompanies(companiesData);
                } else {
                    // Fallback to sample data only if needed? 
                    // Or check localStorage companies migration? 
                    // Companies page usually handles migration. 
                    // We can just rely on what getCompanies returns.
                    // If empty, the dropdown will just be empty.
                }

            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        };
        loadData();
    }, []);

    // Update content whenever originalContent, partyA, partyB, originalPartyA, or originalPartyB changes
    useEffect(() => {
        if (originalContent && (partyA || partyB || addressA || addressB || presidentPositionA || presidentNameA || presidentPositionB || presidentNameB)) {
            updateContentWithParties(originalContent, partyA, partyB, addressA, addressB, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB);
        }
    }, [originalContent, partyA, partyB, addressA, addressB, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB, originalPartyA, originalPartyB, originalAddressA, originalAddressB, originalPresidentPositionA, originalPresidentNameA, originalPresidentPositionB, originalPresidentNameB]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedFile(file);
        setFileName(file.name); // Initialize file name

        try {
            let text = '';

            if (file.name.endsWith('.docx')) {
                // Handle .docx files using mammoth
                const arrayBuffer = await file.arrayBuffer();
                // Dynamically import mammoth to avoid SSR issues if any, though client component is fine
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
                if (result.messages.length > 0) {
                    console.log('Mammoth messages:', result.messages);
                }
            } else {
                // Handle text files using encoding-japanese
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);

                // Detect encoding
                const detectedEncoding = Encoding.detect(uint8Array);
                console.log('Detected encoding:', detectedEncoding);

                // Convert to Unicode array
                const unicodeArray = Encoding.convert(uint8Array, {
                    to: 'UNICODE',
                    from: detectedEncoding || 'AUTO'
                });

                // Convert to string
                text = Encoding.codeToString(unicodeArray);
            }

            setContent(text);
            setOriginalContent(text); // Save original content
            setIsEditing(true);

            // Try to extract party names using Gemini AI
            let apiKey = null;
            try {
                const settings = await getUserSettings();
                apiKey = settings?.gemini_api_key;
            } catch (e) {
                console.error('Failed to get settings', e);
            }
            // fallback to localStorage for now if not in settings? No, migrate first.
            if (!apiKey) apiKey = localStorage.getItem('geminiApiKey'); // temporary fallback

            if (apiKey) {
                setIsExtractingParties(true);
                try {
                    const extracted = await extractPartiesFromText(text, apiKey);

                    const newOriginalA: string[] = [];
                    const newOriginalB: string[] = [];
                    const newOriginalAddressA: string[] = [];
                    const newOriginalAddressB: string[] = [];
                    const newOriginalPresidentPositionA: string[] = [];
                    const newOriginalPresidentNameA: string[] = [];
                    const newOriginalPresidentPositionB: string[] = [];
                    const newOriginalPresidentNameB: string[] = [];

                    // Store extracted names as "Original" names to be replaced
                    if (extracted.partyA) {
                        newOriginalA.push(extracted.partyA);
                        setPartyA(extracted.partyA);
                    }
                    if (extracted.partyB) {
                        newOriginalB.push(extracted.partyB);
                        setPartyB(extracted.partyB);
                    }
                    if (extracted.addressA) {
                        newOriginalAddressA.push(extracted.addressA);
                        setAddressA(extracted.addressA);
                    }
                    if (extracted.addressB) {
                        newOriginalAddressB.push(extracted.addressB);
                        setAddressB(extracted.addressB);
                    }
                    if (extracted.presidentPositionA) {
                        newOriginalPresidentPositionA.push(extracted.presidentPositionA);
                        setPresidentPositionA(extracted.presidentPositionA);
                    }
                    if (extracted.presidentNameA) {
                        newOriginalPresidentNameA.push(extracted.presidentNameA);
                        setPresidentNameA(extracted.presidentNameA);
                    }
                    if (extracted.presidentPositionB) {
                        newOriginalPresidentPositionB.push(extracted.presidentPositionB);
                        setPresidentPositionB(extracted.presidentPositionB);
                    }
                    if (extracted.presidentNameB) {
                        newOriginalPresidentNameB.push(extracted.presidentNameB);
                        setPresidentNameB(extracted.presidentNameB);
                    }

                    // Also run regex fallback to find other variations/occurrences
                    const regexResults = getRegexMatches(text);
                    if (regexResults.partyA) newOriginalA.push(regexResults.partyA);
                    if (regexResults.partyB) newOriginalB.push(regexResults.partyB);
                    // Regex for addresses is hard, but if we had it, we'd push it here

                    // Remove duplicates
                    setOriginalPartyA([...new Set(newOriginalA)]);
                    setOriginalPartyB([...new Set(newOriginalB)]);
                    setOriginalAddressA([...new Set(newOriginalAddressA)]);
                    setOriginalAddressB([...new Set(newOriginalAddressB)]);
                    setOriginalPresidentPositionA([...new Set(newOriginalPresidentPositionA)]);
                    setOriginalPresidentNameA([...new Set(newOriginalPresidentNameA)]);
                    setOriginalPresidentPositionB([...new Set(newOriginalPresidentPositionB)]);
                    setOriginalPresidentNameB([...new Set(newOriginalPresidentNameB)]);

                } catch (error) {
                    console.error('Error extracting parties with AI:', error);
                    // Fallback to regex if AI extraction fails
                    fallbackRegexExtraction(text);
                } finally {
                    setIsExtractingParties(false);
                }
            } else {
                // Fallback to regex if no API key
                fallbackRegexExtraction(text);
            }

        } catch (error) {
            console.error('Error reading file:', error);
            alert('ファイルの読み込みに失敗しました。');
        }
    };

    const getRegexMatches = (text: string) => {
        // Pattern 1: 〇〇 (以下「甲」という)
        const partyAMatch = text.match(/([^\s\n]+)\s*[(（]以下[、，]?[「『]甲[」』]という[)）]/);
        const partyBMatch = text.match(/([^\s\n]+)\s*[(（]以下[、，]?[「『]乙[」』]という[)）]/);

        // Pattern 2: 甲：〇〇
        const partyAMatch2 = text.match(/甲[：:]\s*([^\n]+)/);
        const partyBMatch2 = text.match(/乙[：:]\s*([^\n]+)/);

        // Pattern 3: 甲 (注文者) 〇〇
        const partyAMatch3 = text.match(/甲\s*[(（].*?[)）]\s*([^\n]+)/);
        const partyBMatch3 = text.match(/乙\s*[(（].*?[)）]\s*([^\n]+)/);

        // Pattern 4: 甲 〇〇 (Simple space separator, excluding patterns starting with symbols, same line only)
        const partyAMatch4 = text.match(/甲(?![：:(\[（])(?![ \t\u3000]*\n)[ \t\u3000]+([^\n]+)/);
        const partyBMatch4 = text.match(/乙(?![：:(\[（])(?![ \t\u3000]*\n)[ \t\u3000]+([^\n]+)/);

        let extractedA = '';
        let extractedB = '';

        if (partyAMatch) extractedA = partyAMatch[1];
        else if (partyAMatch2) extractedA = partyAMatch2[1].trim();
        else if (partyAMatch3) extractedA = partyAMatch3[1].trim();
        else if (partyAMatch4) extractedA = partyAMatch4[1].trim();

        if (partyBMatch) extractedB = partyBMatch[1];
        else if (partyBMatch2) extractedB = partyBMatch2[1].trim();
        else if (partyBMatch3) extractedB = partyBMatch3[1].trim();
        else if (partyBMatch4) extractedB = partyBMatch4[1].trim();

        return {
            partyA: extractedA,
            partyB: extractedB,
            // Return all matches for robust replacement
            allMatchesA: [
                partyAMatch?.[1],
                partyAMatch2?.[1].trim(),
                partyAMatch3?.[1].trim(),
                partyAMatch4?.[1].trim()
            ].filter(Boolean) as string[],
            allMatchesB: [
                partyBMatch?.[1],
                partyBMatch2?.[1].trim(),
                partyBMatch3?.[1].trim(),
                partyBMatch4?.[1].trim()
            ].filter(Boolean) as string[]
        };
    };

    const fallbackRegexExtraction = (text: string) => {
        const matches = getRegexMatches(text);

        if (matches.allMatchesA.length > 0) {
            setOriginalPartyA(matches.allMatchesA);
            // Use the first found match as the display value if not already set
            if (!partyA) setPartyA(matches.partyA);
        }
        if (matches.allMatchesB.length > 0) {
            setOriginalPartyB(matches.allMatchesB);
            // Use the first found match as the display value if not already set
            if (!partyB) setPartyB(matches.partyB);
        }
    };

    const updateContentWithParties = (baseContent: string, currentA: string, currentB: string, currentAddressA: string, currentAddressB: string, currentPresidentPositionA: string, currentPresidentNameA: string, currentPresidentPositionB: string, currentPresidentNameB: string) => {
        let updatedContent = baseContent;

        // Replace all variations of original party A name with current input
        if (originalPartyA.length > 0 && currentA) {
            originalPartyA.forEach(origA => {
                if (origA) {
                    const escapedOriginalA = origA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalA, 'g'), currentA);
                }
            });
        }

        // Replace all variations of original party B name with current input
        if (originalPartyB.length > 0 && currentB) {
            originalPartyB.forEach(origB => {
                if (origB) {
                    const escapedOriginalB = origB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalB, 'g'), currentB);
                }
            });
        }

        // Replace all variations of original address A with current input
        if (originalAddressA.length > 0 && currentAddressA) {
            originalAddressA.forEach(origAddrA => {
                if (origAddrA) {
                    const escapedOriginalAddrA = origAddrA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalAddrA, 'g'), currentAddressA);
                }
            });
        }

        // Replace all variations of original address B with current input
        if (originalAddressB.length > 0 && currentAddressB) {
            originalAddressB.forEach(origAddrB => {
                if (origAddrB) {
                    const escapedOriginalAddrB = origAddrB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalAddrB, 'g'), currentAddressB);
                }
            });
        }

        // Replace all variations of original president position A with current input
        if (originalPresidentPositionA.length > 0 && currentPresidentPositionA) {
            originalPresidentPositionA.forEach(origPosA => {
                if (origPosA) {
                    const escapedOriginalPosA = origPosA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalPosA, 'g'), currentPresidentPositionA);
                }
            });
        }

        // Replace all variations of original president name A with current input
        if (originalPresidentNameA.length > 0 && currentPresidentNameA) {
            originalPresidentNameA.forEach(origNameA => {
                if (origNameA) {
                    const escapedOriginalNameA = origNameA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalNameA, 'g'), currentPresidentNameA);
                }
            });
        }

        // Replace all variations of original president position B with current input
        if (originalPresidentPositionB.length > 0 && currentPresidentPositionB) {
            originalPresidentPositionB.forEach(origPosB => {
                if (origPosB) {
                    const escapedOriginalPosB = origPosB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalPosB, 'g'), currentPresidentPositionB);
                }
            });
        }

        // Replace all variations of original president name B with current input
        if (originalPresidentNameB.length > 0 && currentPresidentNameB) {
            originalPresidentNameB.forEach(origNameB => {
                if (origNameB) {
                    const escapedOriginalNameB = origNameB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent.replace(new RegExp(escapedOriginalNameB, 'g'), currentPresidentNameB);
                }
            });
        }

        setContent(updatedContent);
    };

    const handlePartyAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPartyA(newVal);
        updateContentWithParties(originalContent, newVal, partyB, addressA, addressB, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB);
    };

    const handlePartyBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPartyB(newVal);
        updateContentWithParties(originalContent, partyA, newVal, addressA, addressB, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB);
    };

    const handleAddressAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setAddressA(newVal);
        updateContentWithParties(originalContent, partyA, partyB, newVal, addressB, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB);
    };

    const handleAddressBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setAddressB(newVal);
        updateContentWithParties(originalContent, partyA, partyB, addressA, newVal, presidentPositionA, presidentNameA, presidentPositionB, presidentNameB);
    };

    const handlePresidentPositionAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPresidentPositionA(newVal);
        updateContentWithParties(originalContent, partyA, partyB, addressA, addressB, newVal, presidentNameA, presidentPositionB, presidentNameB);
    };

    const handlePresidentNameAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPresidentNameA(newVal);
        updateContentWithParties(originalContent, partyA, partyB, addressA, addressB, presidentPositionA, newVal, presidentPositionB, presidentNameB);
    };

    const handlePresidentPositionBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPresidentPositionB(newVal);
        updateContentWithParties(originalContent, partyA, partyB, addressA, addressB, presidentPositionA, presidentNameA, newVal, presidentNameB);
    };

    const handlePresidentNameBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setPresidentNameB(newVal);
        updateContentWithParties(originalContent, partyA, partyB, addressA, addressB, presidentPositionA, presidentNameA, presidentPositionB, newVal);
    };

    const handleUseSavedPartyB = () => {
        if (savedPartyBInfo) {
            setPartyB(savedPartyBInfo);
            const newAddressB = savedPartyBAddress || addressB;
            const newPresidentPositionB = savedPartyBPresidentPosition || presidentPositionB;
            const newPresidentNameB = savedPartyBPresidentName || presidentNameB;

            if (savedPartyBAddress) setAddressB(savedPartyBAddress);
            if (savedPartyBPresidentPosition) setPresidentPositionB(savedPartyBPresidentPosition);
            if (savedPartyBPresidentName) setPresidentNameB(savedPartyBPresidentName);

            updateContentWithParties(originalContent, partyA, savedPartyBInfo, addressA, newAddressB, presidentPositionA, presidentNameA, newPresidentPositionB, newPresidentNameB);
        }
    };

    const handleSaveToCompanyList = async (name: string, address: string, presidentTitle: string, presidentName: string) => {
        if (!name) return;

        // Check if already exists
        if (companies.some(c => c.name === name)) {
            alert('この企業はすでに企業一覧に登録されています。');
            return;
        }

        try {
            const newCompany = {
                name,
                address,
                presidentTitle,
                presidentName,
                postalCode: '',
                building: null,
                contactPerson: '',
                email: '',
                phone: '',
                position: null
            };

            await createCompany(newCompany);

            // Refresh companies list
            const updatedCompanies = await getCompanies();
            setCompanies(updatedCompanies || []);

            alert(`${name} を企業一覧に保存しました。`);
        } catch (error) {
            console.error('Failed to save company:', error);
            alert('企業一覧への保存に失敗しました。');
        }
    };

    const handleUseMyCompanyInfo = () => {
        if (savedSellerInfo) {
            setPartyA(savedSellerInfo.name);
            setAddressA(savedSellerInfo.address);
            setPresidentPositionA(savedSellerInfo.presidentTitle);
            setPresidentNameA(savedSellerInfo.presidentName);

            updateContentWithParties(
                originalContent,
                savedSellerInfo.name,
                partyB,
                savedSellerInfo.address,
                addressB,
                savedSellerInfo.presidentTitle,
                savedSellerInfo.presidentName,
                presidentPositionB,
                presidentNameB
            );
        }
    };

    const handleSelectCompanyForPartyB = (company: Company) => {
        setPartyB(company.name);

        const parts = [
            company.postalCode ? `〒${company.postalCode}` : '',
            company.address,
            company.building
        ].filter(Boolean);
        const newAddressB = parts.join(' ');
        setAddressB(newAddressB);

        const newPresidentPositionB = company.presidentTitle;
        setPresidentPositionB(newPresidentPositionB);

        const newPresidentNameB = company.presidentName;
        setPresidentNameB(newPresidentNameB);

        setShowPartyBSuggestions(false);

        updateContentWithParties(
            originalContent,
            partyA,
            company.name,
            addressA,
            newAddressB,
            presidentPositionA,
            presidentNameA,
            newPresidentPositionB,
            newPresidentNameB
        );
    };

    const handleSelectCompanyForPartyA = (company: Company) => {
        setPartyA(company.name);

        const parts = [
            company.postalCode ? `〒${company.postalCode}` : '',
            company.address,
            company.building
        ].filter(Boolean);
        const newAddressA = parts.join(' ');
        setAddressA(newAddressA);

        const newPresidentPositionA = company.presidentTitle;
        setPresidentPositionA(newPresidentPositionA);

        const newPresidentNameA = company.presidentName;
        setPresidentNameA(newPresidentNameA);

        setShowPartyASuggestions(false);

        updateContentWithParties(
            originalContent,
            company.name,
            partyB,
            newAddressA,
            addressB,
            newPresidentPositionA,
            newPresidentNameA,
            presidentPositionB,
            presidentNameB
        );
    };

    const handleClearPartyA = () => {
        setPartyA('');
        setAddressA('');
        setPresidentPositionA('');
        setPresidentNameA('');
        updateContentWithParties(originalContent, '', partyB, '', addressB, '', '', presidentPositionB, presidentNameB);
    };

    const handleClearPartyB = () => {
        setPartyB('');
        setAddressB('');
        setPresidentPositionB('');
        setPresidentNameB('');
        updateContentWithParties(originalContent, partyA, '', addressA, '', presidentPositionA, presidentNameA, '', '');
    };

    const handleSave = async () => {
        const templateData = {
            name: fileName,
            partyA,
            partyB,
            addressA,
            addressB,
            presidentPositionA,
            presidentNameA,
            presidentPositionB,
            presidentNameB,
            content,
        };

        try {
            if (editingTemplateId) {
                // Update existing template
                await updateTemplate(editingTemplateId, templateData);
                alert('テンプレートを更新しました');
            } else {
                // Create new template
                await createTemplate(templateData);
                alert('契約書を保存しました');
            }

            // Reload templates
            const reloaded = await getTemplates();
            setSavedTemplates(reloaded || []);

        } catch (error) {
            console.error('Failed to save template:', error);
            alert('保存に失敗しました');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm('このテンプレートを削除しますか？')) {
            try {
                await deleteTemplate(id);
                // Reload
                const updatedTemplates = savedTemplates.filter(t => t.id !== id);
                setSavedTemplates(updatedTemplates);
                setOpenMenuId(null);
            } catch (error) {
                console.error('Failed to delete template:', error);
                alert('削除に失敗しました');
            }
        }
    };

    const handleEditTemplate = (template: SavedTemplate) => {
        setContent(template.content);
        setOriginalContent(template.content); // Assume saved content is the base for further edits
        setPartyA(template.partyA);
        setPartyB(template.partyB);
        setAddressA(template.addressA || '');
        setAddressB(template.addressB || '');
        setPresidentPositionA(template.presidentPositionA || '');
        setPresidentNameA(template.presidentNameA || '');
        setPresidentPositionB(template.presidentPositionB || '');
        setPresidentNameB(template.presidentNameB || '');
        setUploadedFile(new File([template.content], template.name, { type: 'text/plain' }));
        setFileName(template.name); // Set file name from template
        setIsEditing(true);
        setEditingTemplateId(template.id); // Set the ID being edited
        setOpenMenuId(null);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUseTemplate = (template: SavedTemplate) => {
        setContent(template.content);
        setOriginalContent(template.content);
        setPartyA(template.partyA);
        setPartyB(template.partyB);
        setAddressA(template.addressA || '');
        setAddressB(template.addressB || '');
        setPresidentPositionA(template.presidentPositionA || '');
        setPresidentNameA(template.presidentNameA || '');
        setPresidentPositionB(template.presidentPositionB || '');
        setPresidentNameB(template.presidentNameB || '');
        setUploadedFile(new File([template.content], template.name, { type: 'text/plain' }));
        setFileName(template.name); // Set file name from template
        setIsEditing(true);
        setEditingTemplateId(null); // Create new, don't overwrite
        setOpenMenuId(null);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDownload = async () => {
        const currentFileName = fileName || 'contract.txt';

        if (currentFileName.endsWith('.docx')) {
            try {
                const { Document, Packer, Paragraph, TextRun } = await import('docx');

                const lines = content.split('\n');
                const children = lines.map(line => new Paragraph({
                    children: [new TextRun(line)],
                }));

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: children,
                    }],
                });

                const blob = await Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = currentFileName;
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error generating docx:', error);
                alert('docxファイルの生成に失敗しました。');
            }
        } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentFileName;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleDownloadAndCreateContract = async () => {
        await handleDownload();

        // Construct query parameters
        const params = new URLSearchParams();
        if (partyA) params.set('partyA', partyA);
        if (partyB) params.set('partyB', partyB);

        // Remove extension from title for the contract list
        let cleanTitle = fileName || '契約書';
        if (cleanTitle.endsWith('.docx')) cleanTitle = cleanTitle.slice(0, -5);
        else if (cleanTitle.endsWith('.txt')) cleanTitle = cleanTitle.slice(0, -4);
        params.set('title', cleanTitle);

        router.push(`/contracts/new?${params.toString()}`);
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <BackButton />
                            <h1 className="text-2xl font-bold">
                                {editingTemplateId ? 'テンプレート編集' : 'テンプレート'}
                            </h1>
                            {editingTemplateId && (
                                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full border border-orange-200">
                                    テンプレートを収集中
                                </span>
                            )}
                        </div>
                        <UserMenu />
                    </div>

                    {/* Template List Section */}
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-6">テンプレートから作成</h2>
                        {savedTemplates.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 dark:text-gray-400">テンプレート文書をアップロードしてください。</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors relative"
                                    >
                                        <div className="flex items-start gap-2 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {template.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {new Date(template.savedAt).toLocaleString('ja-JP')}
                                                </p>
                                            </div>

                                            {/* Three-dot menu */}
                                            <div className="relative flex-shrink-0">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="メニュー"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                                    </svg>
                                                </button>

                                                {/* Dropdown menu */}
                                                {openMenuId === template.id && (
                                                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                                                        <button
                                                            onClick={() => handleEditTemplate(template)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-t-md"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                            </svg>
                                                            編集
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTemplate(template.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 rounded-b-md"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                            </svg>
                                                            削除
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-3">
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">甲: </span>
                                                <span className="text-gray-900 dark:text-gray-100">{template.partyA || '未設定'}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">乙: </span>
                                                <span className="text-gray-900 dark:text-gray-100">{template.partyB || '未設定'}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">甲住所: </span>
                                                <span className="text-gray-900 dark:text-gray-100">{template.addressA || '未設定'}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">甲代表: </span>
                                                <span className="text-gray-900 dark:text-gray-100">
                                                    {template.presidentPositionA} {template.presidentNameA}
                                                </span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">乙住所: </span>
                                                <span className="text-gray-900 dark:text-gray-100">{template.addressB || '未設定'}</span>
                                            </div>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">乙代表: </span>
                                                <span className="text-gray-900 dark:text-gray-100">
                                                    {template.presidentPositionB} {template.presidentNameB}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mb-3">
                                            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                                                {template.content.substring(0, 200)}...
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => handleUseTemplate(template)}
                                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
                                        >
                                            このテンプレートで作成する
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File Upload Section */}
                    {!isEditing && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">ファイルをアップロード</h2>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".txt,.doc,.docx"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                    />
                                </svg>
                                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    契約書テンプレートをアップロード
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    .txt, .doc, .docx ファイルをドラッグ&ドロップまたはクリックして選択
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                >
                                    ファイルを選択
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Editor Section */}
                    {isEditing && (
                        <div className={`space-y-6 ${editingTemplateId ? 'p-6 border-2 border-orange-200 rounded-xl bg-orange-50/30' : ''}`}>
                            {/* File Info */}
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-6 h-6 text-gray-600 dark:text-gray-400"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                        />
                                    </svg>
                                    <input
                                        type="text"
                                        value={fileName}
                                        onChange={(e) => setFileName(e.target.value)}
                                        className="font-medium text-gray-900 dark:text-gray-100 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 w-full max-w-md"
                                        placeholder="ファイル名を入力"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditingTemplateId(null);
                                        setUploadedFile(null);
                                        setFileName('');
                                        setContent('');
                                        setOriginalContent('');
                                        setPartyA('');
                                        setPartyB('');
                                        setAddressA('');
                                        setAddressB('');
                                        setPresidentPositionA('');
                                        setPresidentNameA('');
                                        setPresidentPositionB('');
                                        setPresidentNameB('');
                                    }}
                                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                                >
                                    削除
                                </button>
                            </div>

                            {/* Party Names Editor */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            甲（契約者A）
                                        </label>
                                        <button
                                            onClick={handleClearPartyA}
                                            className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                        >
                                            クリア
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {savedSellerInfo && (
                                            <button
                                                onClick={handleUseMyCompanyInfo}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                            >
                                                自社情報を入力
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setTargetParty('partyA');
                                                setIsCompanyModalOpen(true);
                                                setCompanySearchQuery('');
                                            }}
                                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs transition-colors"
                                        >
                                            企業一覧から選択
                                        </button>
                                        {partyA && !companies.some(c => c.name === partyA) && (
                                            <button
                                                onClick={() => handleSaveToCompanyList(partyA, addressA, presidentPositionA, presidentNameA)}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                                                title="入力された情報を企業一覧に新規登録します"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                企業一覧に保存
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={partyA}
                                            onChange={handlePartyAChange}
                                            onFocus={() => setShowPartyASuggestions(true)}
                                            placeholder="甲の名前を入力"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                        />
                                        {showPartyASuggestions && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowPartyASuggestions(false)}
                                                ></div>
                                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {companies
                                                        .filter(company =>
                                                            company.name.toLowerCase().includes(partyA.toLowerCase()) ||
                                                            (company.presidentName && company.presidentName.toLowerCase().includes(partyA.toLowerCase()))
                                                        )
                                                        .map((company) => (
                                                            <button
                                                                key={company.id}
                                                                onClick={() => handleSelectCompanyForPartyA(company)}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                                                            >
                                                                <span className="font-medium">{company.name}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {company.presidentTitle} {company.presidentName}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    {companies.filter(company =>
                                                        company.name.toLowerCase().includes(partyA.toLowerCase()) ||
                                                        (company.presidentName && company.presidentName.toLowerCase().includes(partyA.toLowerCase()))
                                                    ).length === 0 && (
                                                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                                一致する企業が見つかりません
                                                            </div>
                                                        )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            甲の住所（所在地）
                                        </label>
                                        <input
                                            type="text"
                                            value={addressA}
                                            onChange={handleAddressAChange}
                                            placeholder="甲の住所を入力"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                甲の代表役職
                                            </label>
                                            <input
                                                type="text"
                                                value={presidentPositionA}
                                                onChange={handlePresidentPositionAChange}
                                                placeholder="役職"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                甲の代表氏名
                                            </label>
                                            <input
                                                type="text"
                                                value={presidentNameA}
                                                onChange={handlePresidentNameAChange}
                                                placeholder="氏名"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            乙（契約者B）
                                        </label>
                                        <button
                                            onClick={handleClearPartyB}
                                            className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                        >
                                            クリア
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {savedPartyBInfo && (
                                            <button
                                                onClick={handleUseSavedPartyB}
                                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                                            >
                                                乙を自社に設定
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setTargetParty('partyB');
                                                setIsCompanyModalOpen(true);
                                                setCompanySearchQuery('');
                                            }}
                                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-xs transition-colors"
                                        >
                                            企業一覧から選択
                                        </button>
                                        {partyB && !companies.some(c => c.name === partyB) && (
                                            <button
                                                onClick={() => handleSaveToCompanyList(partyB, addressB, presidentPositionB, presidentNameB)}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                                                title="入力された情報を企業一覧に新規登録します"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                企業一覧に保存
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            value={partyB}
                                            onChange={handlePartyBChange}
                                            onFocus={() => setShowPartyBSuggestions(true)}
                                            placeholder="乙の名前を入力"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        {showPartyBSuggestions && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowPartyBSuggestions(false)}
                                                ></div>
                                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    {companies
                                                        .filter(company =>
                                                            company.name.toLowerCase().includes(partyB.toLowerCase()) ||
                                                            (company.presidentName && company.presidentName.toLowerCase().includes(partyB.toLowerCase()))
                                                        )
                                                        .map((company) => (
                                                            <button
                                                                key={company.id}
                                                                onClick={() => handleSelectCompanyForPartyB(company)}
                                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col"
                                                            >
                                                                <span className="font-medium">{company.name}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {company.presidentTitle} {company.presidentName}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    {companies.filter(company =>
                                                        company.name.toLowerCase().includes(partyB.toLowerCase()) ||
                                                        (company.presidentName && company.presidentName.toLowerCase().includes(partyB.toLowerCase()))
                                                    ).length === 0 && (
                                                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                                一致する企業が見つかりません
                                                            </div>
                                                        )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            乙の住所（所在地）
                                        </label>
                                        <input
                                            type="text"
                                            value={addressB}
                                            onChange={handleAddressBChange}
                                            placeholder="乙の住所を入力"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                乙の代表役職
                                            </label>
                                            <input
                                                type="text"
                                                value={presidentPositionB}
                                                onChange={handlePresidentPositionBChange}
                                                placeholder="役職"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                乙の代表氏名
                                            </label>
                                            <input
                                                type="text"
                                                value={presidentNameB}
                                                onChange={handlePresidentNameBChange}
                                                placeholder="氏名"
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Editor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    契約書内容
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={20}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleSave}
                                    className={`px-6 py-2 text-white rounded-md transition-colors ${editingTemplateId
                                        ? 'bg-orange-600 hover:bg-orange-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {editingTemplateId ? '上書き保存' : '保存'}
                                </button>
                                <button
                                    onClick={handleDownloadAndCreateContract}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                                >
                                    ダウンロード
                                </button>
                            </div>
                        </div>
                    )
                    }


                </div>
            </div>

            {/* Company Selection Modal */}
            {isCompanyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold">
                                {targetParty === 'partyA' ? '甲（契約者A）を選択' : '乙（契約者B）を選択'}
                            </h3>
                            <button
                                onClick={() => setIsCompanyModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="mb-6">
                                <input
                                    type="text"
                                    placeholder="会社名や代表者名で検索..."
                                    value={companySearchQuery}
                                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {companies
                                    .filter(c =>
                                        c.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
                                        (c.presidentName && c.presidentName.toLowerCase().includes(companySearchQuery.toLowerCase()))
                                    )
                                    .map((company) => (
                                        <button
                                            key={company.id}
                                            onClick={() => {
                                                if (targetParty === 'partyA') {
                                                    handleSelectCompanyForPartyA(company);
                                                } else {
                                                    handleSelectCompanyForPartyB(company);
                                                }
                                                setIsCompanyModalOpen(false);
                                            }}
                                            className="text-left p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col gap-1"
                                        >
                                            <div className="font-bold text-gray-900 dark:text-gray-100">{company.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {company.presidentTitle} {company.presidentName}
                                            </div>
                                            <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                                {company.address}
                                            </div>
                                        </button>
                                    ))}
                                {companies.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 dark:text-gray-400 mb-4">登録されている企業がありません。</p>
                                        <button
                                            onClick={() => window.location.href = '/companies/new'}
                                            className="text-blue-600 hover:underline"
                                        >
                                            企業を新規登録する
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                            <button
                                onClick={() => setIsCompanyModalOpen(false)}
                                className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
