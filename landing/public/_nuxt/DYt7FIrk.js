import { M as useState } from '#entry';

const useCompanyNav = () => {
  const prevUrl = useState('companyNavPrev', () => null);
  const nextUrl = useState('companyNavNext', () => null);
  const isVisible = useState('companyNavVisible', () => false);

  return { prevUrl, nextUrl, isVisible }
};

export { useCompanyNav as u };
