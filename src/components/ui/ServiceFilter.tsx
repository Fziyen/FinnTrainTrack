import { serviceGroup, serviceLabels, type ServiceGroup, type ServiceIdentity } from '../../utils/trainServices';

export function ServiceBadge({ service }: { service: Partial<ServiceIdentity> }) {
  return <span className={`service-badge ${serviceGroup(service)}`}>{serviceLabels[serviceGroup(service)]}</span>;
}

export function ServiceFilter({ value, onChange, services }: { value: ServiceGroup; onChange: (value: ServiceGroup) => void; services: Partial<ServiceIdentity>[] }) {
  const groups: ServiceGroup[] = ['all', 'vr', 'hsl', 'industrial'];
  if (value === 'other' || services.some(service => serviceGroup(service) === 'other')) groups.push('other');
  return <div className="service-filters" aria-label="Service filters">{groups.map(group => {
    const count = group === 'all' ? services.length : services.filter(service => serviceGroup(service) === group).length;
    return <button key={group} className={`service-filter ${group} ${value === group ? 'active' : ''}`} aria-pressed={value === group} onClick={() => onChange(group)}><span className="service-dot" />{serviceLabels[group]}<span className="service-count">{count}</span></button>;
  })}</div>;
}
