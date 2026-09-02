import { useState, useEffect } from 'react';
import { 
  TeamMember, 
  Process, 
  Task, 
  Project, 
  Company, 
  Industry, 
  Role, 
  ProcessLink, 
  ProcessNote, 
  ManagementNote, 
  ManagementStrategyData, 
  ManagementAIGovernanceData, 
  ProductItem 
} from '../types';
import { 
  initialMembers, 
  initialProcesses, 
  initialTasks, 
  initialCompanies, 
  initialIndustries, 
  initialRoles, 
  initialManagementNotes, 
  initialManagementStrategy, 
  initialManagementGovernance, 
  initialProducts 
} from '../lib/initialData';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  getDocs,
  OperationType, 
  handleFirestoreError,
  User as FirebaseUser
} from '../lib/firebase';

export function useFirestoreSync(user: FirebaseUser | null) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [processes, setProcesses] = useState<Process[]>(initialProcesses);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [industries, setIndustries] = useState<Industry[]>(initialIndustries);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [processLinks, setProcessLinks] = useState<ProcessLink[]>([]);
  const [processNotes, setProcessNotes] = useState<ProcessNote[]>([]);
  const [managementNotes, setManagementNotes] = useState<ManagementNote[]>(initialManagementNotes);
  const [managementStrategy, setManagementStrategy] = useState<ManagementStrategyData>(initialManagementStrategy);
  const [managementGovernance, setManagementGovernance] = useState<ManagementAIGovernanceData>(initialManagementGovernance);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  const [isMigrating, setIsMigrating] = useState(false);
  const [localDataFound, setLocalDataFound] = useState(false);
  const [isInitializingData, setIsInitializingData] = useState(false);

  // Subscribe to real-time collections
  useEffect(() => {
    if (!user) return;
    
    // TEMPORARY SCRIPT TO FORCE DELETE ORPHANED TASKS
    const deleteOrphans = async () => {
      try {
        const q = query(collection(db, 'tasks'));
        const snap = await getDocs(q);
        snap.docs.forEach(async (d) => {
          const data = d.data();
          if (data.title?.includes('Diseño de artes para anuncios - ASÍ virtual') || data.id !== d.id) {
            await deleteDoc(doc(db, 'tasks', d.id));
            console.log('Force deleted orphaned/corrupted task:', d.id);
          }
        });
      } catch (err) {}
    };
    deleteOrphans();

    const collections: Array<{ name: string; setState: (data: any[]) => void; initial?: any }> = [
      { name: 'members', setState: (data) => setMembers(data), initial: initialMembers },
      { name: 'processes', setState: (data) => setProcesses(data), initial: initialProcesses },
      { name: 'tasks', setState: (data) => setTasks(data), initial: initialTasks },
      { name: 'projects', setState: (data) => setProjects(data), initial: [] },
      { name: 'companies', setState: (data) => setCompanies(data), initial: initialCompanies },
      { name: 'industries', setState: (data) => setIndustries(data), initial: initialIndustries },
      { name: 'roles', setState: (data) => setRoles(data), initial: initialRoles },
      { name: 'process_links', setState: (data) => setProcessLinks(data), initial: [] },
      { name: 'process_notes', setState: (data) => setProcessNotes(data), initial: [] },
      { name: 'management_notes', setState: (data: any[]) => setManagementNotes(data.length > 0 ? data : initialManagementNotes), initial: initialManagementNotes },
      { name: 'management_strategy', setState: (data: any[]) => { if (data.length > 0) setManagementStrategy(data[0]); }, initial: initialManagementStrategy },
      { name: 'management_governance', setState: (data: any[]) => { if (data.length > 0) setManagementGovernance(data[0]); }, initial: initialManagementGovernance },
      { name: 'products', setState: (data) => setProducts(data), initial: initialProducts },
    ];

    const unsubscribes = collections.map(col => {
      return onSnapshot(collection(db, col.name), (snapshot) => {
        if (!snapshot.empty) {
          // Deduplicate by id to ensure no duplicated keys ever enter React state from Firestore snapshots
          const seenIds = new Set<string>();
          const data: any[] = [];
          snapshot.docs.forEach(docSnap => {
            const item = { id: docSnap.id, ...docSnap.data() } as any;
            if (item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              data.push(item);
            }
          });
          col.setState(data);
        } else if (col.initial && Array.isArray(col.initial) && col.initial.length > 0) {
          col.setState(col.initial);
        } else {
          col.setState([]);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, col.name);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  // Synchronize Google user email mapping to the Member document ID in Firestore for Security Rules
  useEffect(() => {
    if (!user || !user.email || members.length === 0) return;
    const found = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
    if (found) {
      const emailDocId = user.email.toLowerCase();
      const writeMapping = async () => {
        try {
          await setDoc(doc(db, 'user_mappings', emailDocId), { memberId: found.id });
        } catch (e) {
          console.warn("Silent mapping sync:", e);
        }
      };
      writeMapping();
    }
  }, [user, members]);

  // Check localStorage for old offline data
  useEffect(() => {
    const keysToCheck = [
      'teampulse_members', 'tp_members', 'ng_members', 'members',
      'teampulse_tasks', 'tp_tasks', 'ng_tasks', 'tasks',
      'teampulse_projects', 'tp_projects', 'ng_projects', 'projects',
      'teampulse_processes', 'tp_processes', 'ng_processes', 'processes',
      'teampulse_companies', 'tp_companies', 'ng_companies', 'companies'
    ];
    const found = keysToCheck.some(key => {
      const data = localStorage.getItem(key);
      try {
        return data && JSON.parse(data).length > 0;
      } catch {
        return false;
      }
    });
    setLocalDataFound(found);
  }, []);

  const migrateFromLocalStorage = async () => {
    if (!user) return;
    if (!window.confirm('Se han detectado datos guardados en este navegador. ¿Deseas migrarlos a tu cuenta de Novagreen IA? Esto no borrará los datos técnicos, pero subirá tu información a la nube.')) return;
    
    setIsMigrating(true);
    try {
      const collections = [
        { local: 'teampulse_members', cloud: 'members' },
        { local: 'tp_members', cloud: 'members' },
        { local: 'ng_members', cloud: 'members' },
        { local: 'members', cloud: 'members' },
        
        { local: 'teampulse_tasks', cloud: 'tasks' },
        { local: 'tp_tasks', cloud: 'tasks' },
        { local: 'ng_tasks', cloud: 'tasks' },
        { local: 'tasks', cloud: 'tasks' },
        
        { local: 'teampulse_projects', cloud: 'projects' },
        { local: 'tp_projects', cloud: 'projects' },
        { local: 'ng_projects', cloud: 'projects' },
        { local: 'projects', cloud: 'projects' },

        { local: 'teampulse_processes', cloud: 'processes' },
        { local: 'tp_processes', cloud: 'processes' },
        { local: 'ng_processes', cloud: 'processes' },
        { local: 'processes', cloud: 'processes' },

        { local: 'teampulse_companies', cloud: 'companies' },
        { local: 'tp_companies', cloud: 'companies' },
        { local: 'ng_companies', cloud: 'companies' },
        { local: 'companies', cloud: 'companies' },

        { local: 'teampulse_industries', cloud: 'industries' },
        { local: 'industries', cloud: 'industries' },

        { local: 'teampulse_roles', cloud: 'roles' },
        { local: 'roles', cloud: 'roles' },
      ];

      let migratedCount = 0;
      for (const col of collections) {
        const localData = localStorage.getItem(col.local);
        if (localData) {
          try {
            const data = JSON.parse(localData);
            if (Array.isArray(data)) {
              for (const item of data) {
                if (item.id) {
                  await setDoc(doc(db, col.cloud, item.id), item);
                  migratedCount++;
                }
              }
            }
          } catch (e) {
            console.error(`Error migrating ${col.local}`, e);
          }
        }
      }

      if (migratedCount > 0) {
        alert(`${migratedCount} elementos migrados correctamente a la nube. El sistema se actualizará ahora.`);
        setLocalDataFound(false);
      } else {
        alert('No se encontraron datos estructurados compatibles para migrar. Intenta cargar los datos iniciales si la cuenta está vacía.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'migration');
    } finally {
      setIsMigrating(false);
    }
  };

  const bootstrapData = async () => {
    if (!user) return;
    setIsInitializingData(true);
    try {
      const collectionsToBootstrap = [
        { name: 'members', data: initialMembers },
        { name: 'processes', data: initialProcesses },
        { name: 'tasks', data: initialTasks },
        { name: 'companies', data: initialCompanies },
        { name: 'industries', data: initialIndustries },
        { name: 'roles', data: initialRoles },
        { name: 'management_notes', data: initialManagementNotes },
        { name: 'management_strategy', data: [initialManagementStrategy] },
        { name: 'management_governance', data: [initialManagementGovernance] },
      ];

      for (const col of collectionsToBootstrap) {
        for (const item of col.data) {
          await setDoc(doc(db, col.name, item.id), item);
        }
      }
      alert('Datos inicializados correctamente en Firebase.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bootstrap');
    } finally {
      setIsInitializingData(false);
    }
  };

  return {
    members,
    setMembers,
    processes,
    setProcesses,
    tasks,
    setTasks,
    projects,
    setProjects,
    companies,
    setCompanies,
    industries,
    setIndustries,
    roles,
    setRoles,
    processLinks,
    setProcessLinks,
    processNotes,
    setProcessNotes,
    managementNotes,
    setManagementNotes,
    managementStrategy,
    setManagementStrategy,
    managementGovernance,
    setManagementGovernance,
    products,
    setProducts,
    isMigrating,
    localDataFound,
    isInitializingData,
    migrateFromLocalStorage,
    bootstrapData
  };
}
