/**
 * Airtable Integration Demo Component
 * Demonstrates how to use the Airtable integration with React
 */

'use client';

import React, { useState } from 'react';
import { useAirtable, filters, buildFilter, AirtableCreateRecord } from '@/lib/airtable';

interface Contact {
  Name: string;
  Email: string;
  Status: 'Active' | 'Inactive';
  Phone?: string;
  Company?: string;
  Notes?: string;
}

interface AirtableContact extends Contact {
  id: string;
  fields: Contact;
  createdTime: string;
}

export function AirtableDemo() {
  const [baseId, setBaseId] = useState('');
  const [tableName, setTableName] = useState('Contacts');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    Name: '',
    Email: '',
    Status: 'Active',
  });

  // Build filter based on status selection
  const filterFormula = statusFilter === 'All' ? undefined : buildFilter(
    filters.equals('Status', statusFilter)
  );

  const {
    records,
    loading,
    error,
    hasMore,
    create,
    update,
    delete: deleteRecords,
    fetchMore,
    refresh,
  } = useAirtable(tableName, {
    baseId: baseId || undefined,
    initialParams: {
      filterByFormula: filterFormula,
      sort: [{ field: 'Name', direction: 'asc' }],
      pageSize: 25,
    },
    autoFetch: !!baseId,
  });

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContact.Name || !newContact.Email) {
      alert('Name and Email are required');
      return;
    }

    try {
      await create({
        fields: newContact as Contact,
      });
      
      setNewContact({
        Name: '',
        Email: '',
        Status: 'Active',
      });
    } catch (err) {
      alert(`Failed to create contact: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStatusToggle = async (record: AirtableContact) => {
    const newStatus = record.fields.Status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      await update([{
        id: record.id,
        fields: { Status: newStatus },
      }]);
    } catch (err) {
      alert(`Failed to update contact: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (record: AirtableContact) => {
    if (!confirm(`Delete ${record.fields.Name}?`)) return;
    
    try {
      await deleteRecords([record.id]);
    } catch (err) {
      alert(`Failed to delete contact: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Airtable Integration Demo</h1>
      
      {/* Configuration */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Base ID (appXXXXXXXXXXXXXX)
            </label>
            <input
              type="text"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              placeholder="Enter your Airtable Base ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in your Airtable base URL or API docs
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Environment Setup */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="text-md font-semibold mb-2">Environment Setup Required</h3>
        <p className="text-sm text-gray-700 mb-2">
          Add these environment variables to your <code>.env.local</code> file:
        </p>
        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`# Required: Your Personal Access Token
AIRTABLE_PAT=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Default base ID (or provide via UI above)
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Optional: For webhook support
AIRTABLE_WEBHOOK_SECRET=your_webhook_secret_here`}
        </pre>
        <p className="text-xs text-gray-600 mt-2">
          Get your PAT from: <a href="https://airtable.com/create/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://airtable.com/create/tokens</a>
        </p>
      </div>

      {!baseId && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-yellow-800">
            Please enter a Base ID above to start using the Airtable integration.
          </p>
        </div>
      )}

      {baseId && (
        <>
          {/* Filters and Actions */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="All">All Contacts</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
            
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Create New Contact Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Add New Contact</h3>
            <form onSubmit={handleCreateContact} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Name *"
                value={newContact.Name || ''}
                onChange={(e) => setNewContact(prev => ({ ...prev, Name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={newContact.Email || ''}
                onChange={(e) => setNewContact(prev => ({ ...prev, Email: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md"
                required
              />
              <select
                value={newContact.Status || 'Active'}
                onChange={(e) => setNewContact(prev => ({ ...prev, Status: e.target.value as 'Active' | 'Inactive' }))}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <input
                type="tel"
                placeholder="Phone"
                value={newContact.Phone || ''}
                onChange={(e) => setNewContact(prev => ({ ...prev, Phone: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="Company"
                value={newContact.Company || ''}
                onChange={(e) => setNewContact(prev => ({ ...prev, Company: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Add Contact
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
              <h4 className="text-red-800 font-medium">Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Records Display */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                Contacts ({records.length} records)
              </h3>
            </div>
            
            {loading && records.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Loading contacts...
              </div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No contacts found. Try adjusting your filters or add a new contact.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {record.fields.Name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.fields.Email}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.fields.Status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {record.fields.Status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.fields.Phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.fields.Company || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleStatusToggle(record as AirtableContact)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Toggle Status
                            </button>
                            <button
                              onClick={() => handleDelete(record as AirtableContact)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-200">
                <button
                  onClick={fetchMore}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Loading more...' : 'Load More Records'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
