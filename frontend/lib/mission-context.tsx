'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { api } from '@/lib/api';
import type { Entity, Mission } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

interface MissionContextType {
  entities: Entity[];
  activeEntity: Entity | null;
  setActiveEntityId: (id: string | null) => void;
  refreshEntities: () => Promise<void>;

  missions: Mission[];
  missionsForActiveEntity: Mission[];
  activeMission: Mission | null;
  setActiveMissionId: (id: string | null) => void;
  loading: boolean;
  refreshMissions: () => Promise<void>;
}

const MissionContext = createContext<MissionContextType | null>(null);
const ACTIVE_MISSION_KEY = 'afcsoft_active_mission';
const ACTIVE_ENTITY_KEY = 'afcsoft_active_entity';

export function MissionProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntityId, setActiveEntityIdState] = useState<string | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEntities = useCallback(async () => {
    if (!currentUser) return;
    const list = (await api.listEntities()) as Entity[];
    setEntities(list);
  }, [currentUser]);

  const refreshMissions = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const list = (await api.listMissions()) as Mission[];
      setMissions(list);
      setActiveId((prev) => {
        if (prev && list.some((m) => m.id === prev)) return prev;
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_MISSION_KEY) : null;
        if (stored && list.some((m) => m.id === stored)) return stored;
        return null;
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshEntities();
      refreshMissions();
      // Chaque nouvelle authentification repart sur le choix d'une entité,
      // sans réouvrir automatiquement la dernière mission.
      setActiveEntityIdState(null);
      setActiveId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_ENTITY_KEY);
        localStorage.removeItem(ACTIVE_MISSION_KEY);
      }
    } else {
      setEntities([]);
      setMissions([]);
      setActiveId(null);
      setActiveEntityIdState(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Keep the active entity in sync with the active mission (e.g. after creating a mission).
  useEffect(() => {
    const m = missions.find((x) => x.id === activeId);
    if (m && m.entity_id !== activeEntityId) {
      setActiveEntityIdState(m.entity_id);
      if (typeof window !== 'undefined') localStorage.setItem(ACTIVE_ENTITY_KEY, m.entity_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const setActiveEntityId = useCallback((id: string | null) => {
    setActiveEntityIdState(id);
    // Une entité seule ne conserve aucune mission active.
    setActiveId(null);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(ACTIVE_ENTITY_KEY, id);
      else localStorage.removeItem(ACTIVE_ENTITY_KEY);
      localStorage.removeItem(ACTIVE_MISSION_KEY);
    }
  }, []);

  const setActiveMissionId = useCallback((id: string | null) => {
    setActiveId(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(ACTIVE_MISSION_KEY, id);
      else localStorage.removeItem(ACTIVE_MISSION_KEY);
    }
  }, []);

  const activeEntity = entities.find((e) => e.id === activeEntityId) ?? null;
  const activeMission = missions.find((m) => m.id === activeId) ?? null;
  const missionsForActiveEntity = activeEntityId
    ? missions.filter((m) => m.entity_id === activeEntityId)
    : [];

  return (
    <MissionContext.Provider
      value={{
        entities,
        activeEntity,
        setActiveEntityId,
        refreshEntities,
        missions,
        missionsForActiveEntity,
        activeMission,
        setActiveMissionId,
        loading,
        refreshMissions,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMission doit être utilisé dans MissionProvider');
  return ctx;
}
