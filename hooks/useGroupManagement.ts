/**
 * hooks/useGroupManagement.ts
 *
 * Provides group CRUD operations for existing group conversations:
 *   - updateGroup: rename / update description
 *   - addMember:   insert a new member row
 *   - removeMember: delete a member row
 *
 * Callers are responsible for refreshing displayed data after mutations.
 */

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export interface UseGroupManagementResult {
    loading: boolean;
    error: string | null;
    clearError: () => void;
    updateGroup: (name: string, description: string, visibility?: 'public' | 'private') => Promise<boolean>;
    addMembers: (userIds: string[]) => Promise<boolean>;
    removeMember: (userId: string) => Promise<boolean>;
}

export function useGroupManagement(groupId: string): UseGroupManagementResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = () => setError(null);

    const updateGroup = async (
        name: string,
        description: string,
        visibility?: 'public' | 'private',
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const updates: Record<string, any> = {
                name: name.trim(),
                description: description.trim() || null,
            };
            if (visibility !== undefined) {
                updates.visibility = visibility;
            }
            const { error: err } = await supabase
                .from('group_conversations')
                .update(updates)
                .eq('id', groupId);
            if (err) throw err;
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Failed to update group');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const addMembers = async (userIds: string[]): Promise<boolean> => {
        if (userIds.length === 0) return true;
        setLoading(true);
        setError(null);
        try {
            const rows = userIds.map((uid) => ({
                group_id: groupId,
                user_id: uid,
                role: 'member' as const,
            }));
            const { error: err } = await supabase.from('group_members').insert(rows);
            if (err) throw err;
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Failed to add member(s)');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeMember = async (userId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            const { error: err } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);
            if (err) throw err;
            return true;
        } catch (e: any) {
            setError(e.message ?? 'Failed to remove member');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, clearError, updateGroup, addMembers, removeMember };
}
