import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  IconButton,
  Button,
  Stack,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  LinearProgress,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Snackbar,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// (AssignmentTurnedInIcon removed — not used)

// Smell categories for the dropdown
const CATEGORIES = ['Floral', 'Food', 'Woody', 'Chemical', 'Other'];

// Initial mock data
const initialSmells = [
  { id: 's1', name: 'Coffee', category: 'Food', description: 'Roasted coffee aroma' },
  { id: 's2', name: 'Lavender', category: 'Floral', description: 'Fresh lavender' },
  { id: 's3', name: 'Smoke', category: 'Chemical', description: 'Burnt wood / smoke' },
];

const initialCartridges = Array.from({ length: 8 }).map((_, i) => ({
  slot: i + 1,
  smellId: i < 3 ? initialSmells[i].id : null, // pre-assign first 3 as example
  level: 60 - i * 5, // mock percentage
  lastReplaced: i < 3 ? new Date(Date.now() - i * 86400000).toLocaleDateString() : null,
  estimatedSprays: Math.max(0, Math.floor((60 - i * 5) / 2)),
  missing: false,
  active: true,
}));

export default function EmitterSetup() {
  const [deviceOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [smells, setSmells] = useState(initialSmells);
  const [cartridges, setCartridges] = useState(initialCartridges);

  // UI state
  const [filter, setFilter] = useState('');
  const [smellDialogOpen, setSmellDialogOpen] = useState(false);
  const [editingSmell, setEditingSmell] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [assignDialog, setAssignDialog] = useState({ open: false, slot: null });
  const [snack, setSnack] = useState({ open: false, severity: 'info', message: '' });

  useEffect(() => {
    // mock auto-refresh every 30s to update levels (disabled to avoid noise)
    return () => {};
  }, []);

  const filteredSmells = useMemo(() => {
    if (!filter) return smells;
    return smells.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));
  }, [smells, filter]);

  function refreshData() {
    // mock: update timestamp and slightly randomize levels
    setCartridges((c) => c.map((item) => ({ ...item, level: Math.max(0, Math.min(100, item.level - Math.floor(Math.random() * 3))) })));
    setLastUpdated(new Date());
    setSnack({ open: true, severity: 'info', message: 'Refreshed data (mock)' });
  }

  function openAddSmell() {
    setEditingSmell({ id: null, name: '', category: '', description: '' });
    setSmellDialogOpen(true);
  }

  function openEditSmell(s) {
    setEditingSmell({ ...s });
    setSmellDialogOpen(true);
  }

  function saveSmell() {
    if (!editingSmell.name || editingSmell.name.trim() === '') {
      setSnack({ open: true, severity: 'error', message: 'Smell name is required' });
      return;
    }

    if (editingSmell.id) {
      setSmells((arr) => arr.map((s) => (s.id === editingSmell.id ? editingSmell : s)));
      setSnack({ open: true, severity: 'success', message: 'Smell updated' });
    } else {
      const id = `s${Date.now()}`;
      setSmells((arr) => [{ ...editingSmell, id }, ...arr]);
      setSnack({ open: true, severity: 'success', message: 'Smell added' });
    }

    setSmellDialogOpen(false);
    setEditingSmell(null);
  }

  function confirmDeleteSmell(s) {
    // check assignments
    const assigned = cartridges.some((c) => c.smellId === s.id);
    setDeleteCandidate({ smell: s, assigned });
  }

  function doDeleteSmell() {
    const s = deleteCandidate.smell;
    // unassign from cartridges
    setCartridges((arr) => arr.map((c) => (c.smellId === s.id ? { ...c, smellId: null } : c)));
    setSmells((arr) => arr.filter((x) => x.id !== s.id));
    setSnack({ open: true, severity: 'success', message: `Smell '${s.name}' deleted` });
    setDeleteCandidate(null);
  }

  function openAssign(slot) {
    setAssignDialog({ open: true, slot });
  }

  function assignSmellToSlot(smellId) {
    const slot = assignDialog.slot;
    setCartridges((arr) => arr.map((c) => (c.slot === slot ? { ...c, smellId } : c)));
    setAssignDialog({ open: false, slot: null });
    setSnack({ open: true, severity: 'success', message: 'Assigned smell to cartridge' });
  }

  function toggleActive(slot) {
    setCartridges((arr) => arr.map((c) => (c.slot === slot ? { ...c, active: !c.active } : c)));
  }

  function markEmptySlot(slot) {
    setCartridges((arr) => arr.map((c) => (c.slot === slot ? { ...c, level: 0, smellId: null } : c)));
    setAssignDialog({ open: false, slot: null });
    setSnack({ open: true, severity: 'warning', message: `Cartridge ${slot} marked empty` });
  }

  

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4">Scent System Setup</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 0.5 }}>
            <Chip label={deviceOnline ? 'Device Online' : 'Device Offline'} color={deviceOnline ? 'success' : 'default'} size="small" />
            <Typography variant="caption" color="text.secondary">Last updated: {lastUpdated.toLocaleString()}</Typography>
            <Tooltip title="Refresh data">
              <IconButton size="small" onClick={refreshData}><RefreshIcon /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2} alignItems="flex-start">
        {/* Left: Smells database */}
        <Grid item xs={12} sm={4} md={8}>
          <Paper sx={{ p: 2, height: '64vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TextField placeholder="Search smells" size="small" value={filter} onChange={(e) => setFilter(e.target.value)} fullWidth sx={{ minHeight: 40 }} />
              <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={openAddSmell} sx={{ height: 40, px: 2 }}>Add</Button>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {smells.length === 0 ? (
              <Typography color="text.secondary">No smells defined. Click 'Add New Smell' to create one.</Typography>
            ) : (
              <List sx={{ overflow: 'auto', maxHeight: '48vh' }}>
                {filteredSmells.map((s) => (
                  <ListItem key={s.id} divider>
                    <ListItemText
                      primary={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ fontWeight: 600 }}>{s.name}</Typography><Chip label={s.category} size="small" /></Box>}
                      secondary={s.description}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit smell"><IconButton edge="end" onClick={() => openEditSmell(s)}><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Delete smell"><IconButton edge="end" onClick={() => confirmDeleteSmell(s)} sx={{ ml: 1 }}><DeleteIcon /></IconButton></Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right: Cartridge overview (sticky right column) */}
        <Grid item xs={12} sm={8} md={4}>
          <Paper sx={{ p: 2, position: 'sticky', top: 96, alignSelf: 'flex-start', height: '64vh', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Cartridge Overview</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, flex: 1 }}>
              {cartridges.map((c) => {
                const smell = smells.find((s) => s.id === c.smellId);
                return (
                  <Box key={c.slot}>
                    <Paper sx={{ p: 2, height: '100%' }} variant="outlined">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'grey.200', color: 'text.primary' }}>{c.slot}</Avatar>
                      </Box>

                      <Box sx={{ mb: 1 }}>
                        {smell ? (
                          <Chip label={smell.name} color="primary" size="small" />
                        ) : (
                          <Typography color="text.secondary" variant="body2">No smell assigned</Typography>
                        )}
                      </Box>

                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption">Liquid level</Typography>
                        <LinearProgress variant="determinate" value={c.level} sx={{ height: 8, borderRadius: 1, mt: 0.5 }} />
                        <Typography variant="caption" sx={{ display: 'block' }}>{c.level}% remaining</Typography>
                      </Box>

                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => openAssign(c.slot)} fullWidth disabled={!c.active}>Assign Smell</Button>
                        <Button size="small" variant="outlined" onClick={() => toggleActive(c.slot)} fullWidth color={c.active ? 'warning' : 'success'}>
                          {c.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Add/Edit smell dialog */}
      <Dialog open={smellDialogOpen} onClose={() => setSmellDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSmell && editingSmell.id ? 'Edit Smell' : 'Add New Smell'}</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth sx={{ mt: 1 }} value={editingSmell?.name || ''} onChange={(e) => setEditingSmell((s) => ({ ...s, name: e.target.value }))} />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select value={editingSmell?.category || ''} label="Category" onChange={(e) => setEditingSmell((s) => ({ ...s, category: e.target.value }))}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Description" fullWidth multiline rows={3} sx={{ mt: 2 }} value={editingSmell?.description || ''} onChange={(e) => setEditingSmell((s) => ({ ...s, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSmellDialogOpen(false); setEditingSmell(null); }}>Cancel</Button>
          <Button variant="contained" onClick={saveSmell}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, slot: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Smell to Cartridge {assignDialog.slot}</DialogTitle>
        <DialogContent>
          <List>
            <ListItem button onClick={() => markEmptySlot(assignDialog.slot)}>
              <ListItemText primary="Mark cartridge empty" secondary="Set level to 0 and unassign smell" />
            </ListItem>
          </List>
          <Divider sx={{ my: 1 }} />
          {smells.length === 0 ? (
            <Typography color="text.secondary">No smells defined. Add a smell first.</Typography>
          ) : (
            <List>
              {smells.map((s) => (
                <ListItem key={s.id} button onClick={() => assignSmellToSlot(s.id)}>
                  <ListItemText primary={s.name} secondary={s.category} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, slot: null })}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)}>
        <DialogTitle>Delete smell?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete '{deleteCandidate?.smell.name}'?</Typography>
          {deleteCandidate?.assigned && (
            <Typography color="warning.main" sx={{ mt: 1 }}>This smell is assigned to one or more cartridges. Deleting will unassign it.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={doDeleteSmell}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Container>
  );
}
