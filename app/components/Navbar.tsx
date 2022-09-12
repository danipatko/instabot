import { Popover, Transition } from '@headlessui/react';
import { Link } from '@remix-run/react';
import { Fragment } from 'react';

export default function Navbar() {
    return (
        <Popover className="relative bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center border-b-2 border-gray-100 py-4 md:justify-start md:space-x-10">
                    <div className="flex-1 font-semibold text-base ease-in">{'Instabot'}</div>
                    <div className="-mr-2 -my-2 md:hidden">
                        <Popover.Button className="bg-white rounded-md p-2  text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                            <span className="sr-only">Open menu</span>
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                        </Popover.Button>
                    </div>
                    <Popover.Group as="nav" className="hidden md:flex space-x-10">
                        <Link to={'/'} className="text-base font-medium text-gray-500 hover:text-gray-900">
                            Home
                        </Link>
                        <Link to={'/access'} className="text-base font-medium text-gray-500 hover:text-gray-900">
                            Access
                        </Link>
                        <Link to={'/posts'} className="text-base font-medium text-gray-500 hover:text-gray-900">
                            Posts
                        </Link>
                        <Link to={'/activity'} className="text-base font-medium text-gray-500 hover:text-gray-900">
                            Activity
                        </Link>
                    </Popover.Group>
                </div>
            </div>

            <Transition
                as={Fragment}
                enter="duration-200 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="duration-100 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Popover.Panel className="absolute z-50 top-0 inset-x-0 p-2 transition transform origin-top-right md:hidden">
                    <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-white divide-y-2 divide-gray-50">
                        <div className="pt-5 pb-6 px-5">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-black">Menu</div>
                                <div className="-mr-2">
                                    <Popover.Button className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                                        <span className="sr-only">Close menu</span>
                                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </Popover.Button>
                                </div>
                            </div>
                            <div className="mt-6">
                                <nav className="grid gap-y-8">
                                    <Popover.Button as={Link} to={'/'} className="-m-3 p-3 flex items-center rounded-md hover:bg-gray-100">
                                        <span className="ml-3 text-base font-medium text-gray-900">
                                            <span className="text-indigo-700 text-xl">&#8250;</span> Home
                                        </span>
                                    </Popover.Button>
                                    <Popover.Button as={Link} to={'/access'} className="-m-3 p-3 flex items-center rounded-md hover:bg-gray-100">
                                        <span className="ml-3 text-base font-medium text-gray-900">
                                            <span className="text-indigo-700 text-xl">&#8250;</span> Access
                                        </span>
                                    </Popover.Button>
                                    <Popover.Button as={Link} to={'/posts'} className="-m-3 p-3 flex items-center rounded-md hover:bg-gray-100">
                                        <span className="ml-3 text-base font-medium text-gray-900">
                                            <span className="text-indigo-700 text-xl">&#8250;</span> Posts
                                        </span>
                                    </Popover.Button>
                                    <Popover.Button as={Link} to={'/activity'} className="-m-3 p-3 flex items-center rounded-md hover:bg-gray-100">
                                        <span className="ml-3 text-base font-medium text-gray-900">
                                            <span className="text-indigo-700 text-xl">&#8250;</span> Activity
                                        </span>
                                    </Popover.Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </Popover.Panel>
            </Transition>
        </Popover>
    );
}
